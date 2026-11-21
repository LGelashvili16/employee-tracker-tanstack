import '@tanstack/react-start/server-only'
import { and, asc, count, eq, ilike, isNotNull, or, sql } from 'drizzle-orm'
import { db } from '#/db'
import {
  gpsDevice,
  gpsDeviceDiagnostic,
  gpsDeviceEvent,
  gpsPosition,
} from '#/db/schema/gps/gps.schema'
import { assertPermissions } from '#/lib/authorization/access'
import { gpsPageSize, gpsTimeZone } from '../gps.schemas'
import type { gpsHistoryInput, gpsSaveSchema, GpsSearch } from '../gps.schemas'
import type { Actor } from '#/lib/authorization/actor'
import type { z } from 'zod'

const positionOrder = [
  sql`${gpsPosition.fixAt} desc nulls last`,
  sql`${gpsPosition.receivedAt} desc nulls last`,
  sql`${gpsPosition.id} desc nulls last`,
]

const trackLimit = 2_000

export function readGpsDiagnostics(actor: Actor, deviceId: string) {
  assertPermissions(actor, ['manage.access', 'gps.read'])
  return db
    .select({
      kind: gpsDeviceDiagnostic.kind,
      receivedAt: gpsDeviceDiagnostic.receivedAt,
      errorCode: gpsDeviceDiagnostic.errorCode,
    })
    .from(gpsDeviceDiagnostic)
    .where(eq(gpsDeviceDiagnostic.deviceId, deviceId))
}

export async function readGpsHistory(
  actor: Actor,
  input: z.output<typeof gpsHistoryInput>,
) {
  assertPermissions(actor, ['manage.access', 'gps.read'])
  const deviceFilter = eq(gpsPosition.deviceId, input.deviceId)
  // Compare against Tbilisi calendar midnights and keep the end bound exclusive.
  const filter = and(
    deviceFilter,
    sql`${gpsPosition.fixAt} >= timezone(${gpsTimeZone}, ${input.from}::date::timestamp)`,
    sql`${gpsPosition.fixAt} < timezone(${gpsTimeZone}, (${input.to}::date + 1)::timestamp)`,
  )
  const trackFields = {
    fixAt: gpsPosition.fixAt,
    valid: gpsPosition.valid,
    latitude: gpsPosition.latitude,
    longitude: gpsPosition.longitude,
  }
  return db.transaction(
    async (tx) => {
      const devices = await tx
        .select({
          name: gpsDevice.name,
          reportedId: gpsDevice.reportedId,
          enabled: gpsDevice.enabled,
          lastContactAt: gpsDevice.lastContactAt,
        })
        .from(gpsDevice)
        .where(eq(gpsDevice.id, input.deviceId))
      const device = devices.at(0)
      if (!device) return null

      const latest = await tx
        .select({
          ...trackFields,
          speedKmh: gpsPosition.speedKmh,
          satellites: gpsPosition.satellites,
          cellularSignal: gpsPosition.cellularSignal,
          odometerKm: gpsPosition.odometerKm,
        })
        .from(gpsPosition)
        .where(and(deviceFilter, gpsPosition.valid))
        .orderBy(...positionOrder)
        .limit(1)
      const batteryReports = await tx
        .select({
          percent: gpsPosition.batteryPercent,
          fixAt: gpsPosition.fixAt,
        })
        .from(gpsPosition)
        .where(and(deviceFilter, isNotNull(gpsPosition.batteryPercent)))
        .orderBy(...positionOrder)
        .limit(1)
      const [{ total }] = await tx
        .select({ total: count() })
        .from(gpsPosition)
        .where(filter)
      const page = Math.min(
        input.page,
        Math.max(1, Math.ceil(total / gpsPageSize)),
      )
      const rows = await tx
        .select({
          ...trackFields,
          id: gpsPosition.id,
          receivedAt: gpsPosition.receivedAt,
          speedKmh: gpsPosition.speedKmh,
          course: gpsPosition.course,
          altitude: gpsPosition.altitude,
        })
        .from(gpsPosition)
        .where(filter)
        .orderBy(...positionOrder)
        .limit(gpsPageSize)
        .offset((page - 1) * gpsPageSize)
      const track = await tx
        .select(trackFields)
        .from(gpsPosition)
        .where(filter)
        .orderBy(...positionOrder)
        .limit(trackLimit)
      return {
        device,
        latestFix: latest.at(0) ?? null,
        battery: batteryReports.at(0) ?? null,
        rows,
        page,
        total,
        track: track.reverse(),
        trackLimit,
      }
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}

export async function readGpsWorkspace(actor: Actor, search: GpsSearch) {
  assertPermissions(actor, ['manage.access', 'gps.read'])
  const pattern = `%${search.q.replace(/[\\%_]/g, '\\$&')}%`
  const filter = search.q
    ? or(ilike(gpsDevice.name, pattern), ilike(gpsDevice.reportedId, pattern))
    : undefined
  const latest = db
    .select({
      latitude: gpsPosition.latitude,
      longitude: gpsPosition.longitude,
      fixAt: gpsPosition.fixAt,
      speedKmh: gpsPosition.speedKmh,
    })
    .from(gpsPosition)
    .where(and(eq(gpsPosition.deviceId, gpsDevice.id), gpsPosition.valid))
    .orderBy(...positionOrder)
    .limit(1)
    .as('latest_fix')
  const battery = db
    .select({ percent: gpsPosition.batteryPercent })
    .from(gpsPosition)
    .where(
      and(
        eq(gpsPosition.deviceId, gpsDevice.id),
        isNotNull(gpsPosition.batteryPercent),
      ),
    )
    .orderBy(...positionOrder)
    .limit(1)
    .as('latest_battery')
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: gpsDevice.id,
        name: gpsDevice.name,
        reportedId: gpsDevice.reportedId,
        enabled: gpsDevice.enabled,
        version: gpsDevice.version,
        lastContactAt: gpsDevice.lastContactAt,
        batteryPercent: battery.percent,
        error: {
          receivedAt: gpsDeviceDiagnostic.receivedAt,
          errorCode: gpsDeviceDiagnostic.errorCode,
        },
        position: {
          latitude: latest.latitude,
          longitude: latest.longitude,
          fixAt: latest.fixAt,
          speedKmh: latest.speedKmh,
        },
      })
      .from(gpsDevice)
      .leftJoinLateral(latest, sql`true`)
      .leftJoinLateral(battery, sql`true`)
      .leftJoin(
        gpsDeviceDiagnostic,
        and(
          eq(gpsDeviceDiagnostic.deviceId, gpsDevice.id),
          eq(gpsDeviceDiagnostic.kind, 'decode_error'),
        ),
      )
      .where(filter)
      .orderBy(
        search.sort === 'recent'
          ? sql`${gpsDevice.lastContactAt} desc nulls last`
          : asc(gpsDevice.name),
        asc(gpsDevice.id),
      )
      .limit(gpsPageSize)
      .offset((search.page - 1) * gpsPageSize),
    db.select({ total: count() }).from(gpsDevice).where(filter),
  ])
  return { rows, total: totals[0].total }
}

export async function saveGpsDevice(
  actor: Actor,
  input: z.output<typeof gpsSaveSchema>,
) {
  assertPermissions(actor, ['manage.access', 'gps.read', 'gps.manage'])
  return db.transaction(async (tx) => {
    const fields = {
      name: input.name,
      enabled: input.enabled,
      reportedId: input.reportedId,
    }
    if (input.id === null) {
      const created = (
        await tx
          .insert(gpsDevice)
          .values(fields)
          .onConflictDoNothing({ target: gpsDevice.canonicalId })
          .returning({ id: gpsDevice.id })
      ).at(0)
      if (!created) return false
      await tx.insert(gpsDeviceEvent).values({
        deviceId: created.id,
        actorId: actor.id,
        after: JSON.stringify(fields),
      })
      return true
    }
    const current = (
      await tx
        .select({
          name: gpsDevice.name,
          enabled: gpsDevice.enabled,
          reportedId: gpsDevice.reportedId,
        })
        .from(gpsDevice)
        .where(
          and(eq(gpsDevice.id, input.id), eq(gpsDevice.version, input.version)),
        )
        .for('update')
    ).at(0)
    // Identity is immutable. A replacement tracker must get a new record.
    if (!current || current.reportedId !== input.reportedId) return false
    await tx
      .update(gpsDevice)
      .set({
        name: fields.name,
        enabled: fields.enabled,
        version: input.version + 1,
      })
      .where(eq(gpsDevice.id, input.id))
    await tx.insert(gpsDeviceEvent).values({
      deviceId: input.id,
      actorId: actor.id,
      before: JSON.stringify(current),
      after: JSON.stringify(fields),
    })
    return true
  })
}
