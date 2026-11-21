import { createHash } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import {
  gpsDevice,
  gpsDeviceDiagnostic,
  gpsPosition,
} from '../../../db/schema/gps/gps.schema.ts'
import { canonicalDeviceId } from './protocols/protocol.ts'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { DecodedMessage } from './protocols/protocol.ts'

type DiagnosticKind = typeof gpsDeviceDiagnostic.$inferInsert.kind

function saveDiagnostic(
  db: NodePgDatabase,
  deviceId: string,
  kind: DiagnosticKind,
  receivedAt: Date,
) {
  return db
    .insert(gpsDeviceDiagnostic)
    .values({ deviceId, kind, receivedAt })
    .onConflictDoUpdate({
      target: [gpsDeviceDiagnostic.deviceId, gpsDeviceDiagnostic.kind],
      set: { receivedAt },
      setWhere: sql`${gpsDeviceDiagnostic.receivedAt} < excluded.received_at`,
    })
}

export function createGpsDecodeErrorRecorder(db: NodePgDatabase) {
  return (deviceId: string, receivedAt: Date) =>
    db.transaction(async (tx) => {
      const devices = await tx
        .select({ id: gpsDevice.id })
        .from(gpsDevice)
        .where(
          and(
            eq(gpsDevice.canonicalId, canonicalDeviceId(deviceId)),
            gpsDevice.enabled,
          ),
        )
        .for('update')
      const device = devices.at(0)
      if (device)
        await saveDiagnostic(tx, device.id, 'decode_error', receivedAt)
    })
}

export function createGpsIngest(db: NodePgDatabase) {
  return (message: DecodedMessage, frameHex: string, receivedAt: Date) => {
    if (message.protocol !== 'jt808' || !message.supported)
      return Promise.resolve(false)
    return db.transaction(async (tx) => {
      // Serialize registry changes with packet admission. Never acknowledge
      // positions we cannot commit or admit to a currently enabled device.
      const devices = await tx
        .select({ id: gpsDevice.id, enabled: gpsDevice.enabled })
        .from(gpsDevice)
        .where(eq(gpsDevice.canonicalId, canonicalDeviceId(message.deviceId)))
        .for('update')
      const device = devices.at(0)
      if (!device?.enabled) return false
      if (message.type === '0100') {
        await saveDiagnostic(tx, device.id, 'registration', receivedAt)
      }
      if (message.authenticated === true) {
        if (message.type === '0102' || message.type === '0002') {
          const kind = message.type === '0102' ? 'authentication' : 'heartbeat'
          await saveDiagnostic(tx, device.id, kind, receivedAt)
        }
        const position = message.position
        if (position) {
          await tx
            .insert(gpsPosition)
            .values({
              deviceId: device.id,
              fingerprint: createHash('sha256')
                .update(Buffer.from(frameHex, 'hex'))
                .digest('hex'),
              fixAt: new Date(position.timestamp),
              receivedAt,
              valid: position.valid,
              latitude: position.latitude,
              longitude: position.longitude,
              speedKmh: position.speedKmh,
              course: position.course,
              altitude: position.altitude,
            })
            .onConflictDoNothing({
              target: [gpsPosition.deviceId, gpsPosition.fingerprint],
            })
        }
        await tx
          .update(gpsDevice)
          .set({
            lastContactAt: sql`greatest(${gpsDevice.lastContactAt}, ${receivedAt.toISOString()}::timestamptz)`,
          })
          .where(eq(gpsDevice.id, device.id))
      }
      return true
    })
  }
}
