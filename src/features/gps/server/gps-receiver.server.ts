import { randomUUID } from 'node:crypto'
import { createServer } from 'node:net'
import { GpsSession } from './gps-session.ts'
import type { Socket } from 'node:net'
import type { GpsConfig } from './gps-config.ts'
import type { GpsJournal } from './gps-journal.server.ts'
import { mayReply } from './protocols/protocol.ts'
import type { DecodeContext, DecodedMessage } from './protocols/protocol.ts'

export function createDecodeContext(
  config: GpsConfig,
  receivedAt = new Date(),
): DecodeContext {
  return {
    receivedAt,
    utcOffsetMinutes: config.GPS_UTC_OFFSET_MINUTES,
    allowedDeviceIds: config.GPS_DEVICE_IDS,
    reply: config.GPS_REPLY,
    authSecret: config.GPS_AUTH_SECRET,
  }
}

export function createGpsReceiver(
  config: GpsConfig,
  journal: GpsJournal,
  fatal: () => void,
  ingest?: (
    message: DecodedMessage,
    frameHex: string,
    receivedAt: Date,
  ) => Promise<boolean>,
  saveDecodeError?: (
    deviceId: string,
    receivedAt: Date,
    code?: string,
  ) => Promise<void>,
) {
  const sockets = new Set<Socket>()
  let healthy = true
  // Global budgets also bound floods spread across many reconnecting clients.
  let windowStart = Date.now()
  let connections = 0
  let bytes = 0
  const server = createServer((socket) => {
    if (Date.now() - windowStart >= 60_000) {
      windowStart = Date.now()
      connections = 0
      bytes = 0
    }
    if (
      !healthy ||
      ++connections > 120 ||
      sockets.size >= config.GPS_MAX_CONNECTIONS
    ) {
      socket.destroy()
      return
    }
    sockets.add(socket)
    const connection = randomUUID()
    const session = new GpsSession(config.GPS_PROTOCOL)
    let authenticatedDeviceId: string | undefined
    let receivedBytes = 0
    let reason = 'peer_closed'
    const record = (
      event: Parameters<GpsJournal['write']>[0]['event'],
      details: Record<string, unknown> = {},
    ) => {
      try {
        journal.write({
          event,
          connection,
          receivedAt: new Date().toISOString(),
          ...details,
        })
        if (
          event === 'connect' ||
          event === 'disconnect' ||
          event === 'rejected'
        ) {
          console.info(
            JSON.stringify({
              event: `gps_${event}`,
              connection,
              reason: details.reason,
            }),
          )
        }
        return true
      } catch {
        // Fail closed on disk errors. Do not acknowledge data we failed to record.
        if (healthy) {
          healthy = false
          for (const peer of sockets) peer.destroy()
          server.close()
          fatal()
        }
        return false
      }
    }
    record('connect', {
      remoteAddress: socket.remoteAddress,
      remotePort: socket.remotePort,
    })
    socket.setTimeout(config.GPS_IDLE_SECONDS * 1000)
    const lifetime = setTimeout(() => {
      reason = 'connection_lifetime'
      socket.destroy()
    }, 3_600_000)
    lifetime.unref()
    socket.on('timeout', () => {
      reason = 'idle_timeout'
      socket.destroy()
    })
    socket.on('error', () => {
      reason = 'socket_error'
    })
    let processing = false
    const receive = async (chunk: Buffer) => {
      if (!healthy) return
      if (Date.now() - windowStart >= 60_000) {
        windowStart = Date.now()
        connections = 0
        bytes = 0
      }
      receivedBytes += chunk.length
      bytes += chunk.length
      if (receivedBytes > 4_194_304 || bytes > 4_194_304) {
        reason = 'traffic_limit'
        record('rejected', { reason })
        socket.destroy()
        return
      }
      // Record exact chunk bytes before parsing, including unknown protocols.
      if (!record('receive', { hex: chunk.toString('hex') })) return
      console.info(
        JSON.stringify({
          event: 'gps_receive',
          connection,
          bytes: chunk.length,
        }),
      )
      try {
        // Bound individual parser calls even when the OS coalesces many frames.
        for (let offset = 0; offset < chunk.length; offset += 4096) {
          const context = createDecodeContext(config)
          context.deferReplyAdmission = ingest !== undefined
          for (const result of session.push(
            chunk.subarray(offset, offset + 4096),
            context,
          )) {
            const { decoded, ...frame } = result
            const replies = decoded?.replies ?? []
            if (
              !record('frame', {
                ...frame,
                decoded: decoded
                  ? { ...decoded, replies: undefined }
                  : undefined,
              })
            )
              return
            if (decoded) {
              let allowed = mayReply(decoded.deviceId, {
                ...context,
                reply: true,
                deferReplyAdmission: false,
              })
              if (ingest) {
                try {
                  allowed = await ingest(decoded, frame.hex, context.receivedAt)
                } catch {
                  reason = 'database_unavailable'
                  record('rejected', { reason })
                  socket.destroy()
                  return
                }
                if (socket.destroyed) return
              }
              console.info(
                JSON.stringify({
                  event: 'gps_frame',
                  protocol: decoded.protocol,
                  type: decoded.type,
                  supported: decoded.supported,
                  authenticated: decoded.authenticated,
                  allowed,
                  position: Boolean(decoded.position),
                  valid: decoded.position?.valid,
                }),
              )
              if (ingest && !allowed && decoded.supported) {
                reason = 'device_not_admitted'
                socket.destroy()
                return
              }
              if (ingest && !allowed) continue
              if (decoded.protocol === 'jt808') {
                if (decoded.supported && decoded.type === '0100') {
                  authenticatedDeviceId = undefined
                } else if (decoded.supported && decoded.type === '0102') {
                  authenticatedDeviceId = decoded.authenticated
                    ? decoded.deviceId
                    : undefined
                }
              }
            }
            if (!decoded) {
              console.info(
                JSON.stringify({
                  event: 'gps_decode_error',
                  connection,
                  error: result.error,
                }),
              )
              // Attribute malformed data to the authenticated connection only.
              if (authenticatedDeviceId && saveDecodeError) {
                try {
                  await saveDecodeError(
                    authenticatedDeviceId,
                    context.receivedAt,
                    result.error,
                  )
                } catch {
                  // Diagnostics must not interrupt an otherwise working session.
                  console.warn(
                    JSON.stringify({
                      event: 'gps_diagnostic_write_failed',
                      connection,
                    }),
                  )
                }
              }
            }
            for (const reply of replies) {
              if (socket.writableLength > 65_536) {
                reason = 'reply_buffer_limit'
                socket.destroy()
                return
              }
              if (!record('send', { hex: reply.toString('hex') })) return
              // The journal marks intended sends; callback failures are recorded
              // separately. A send record is not proof of delivery to the tracker.
              if (!socket.write(reply)) socket.pause()
            }
          }
        }
      } catch {
        reason = 'stream_limit_or_protocol_change'
        record('rejected', { reason })
        socket.destroy()
      }
    }
    const resume = () => {
      if (!processing && !socket.writableNeedDrain && !socket.destroyed)
        socket.resume()
    }
    socket.on('data', (chunk: Buffer) => {
      socket.pause()
      processing = true
      void receive(chunk).finally(() => {
        processing = false
        resume()
      })
    })
    socket.on('drain', resume)
    socket.on('close', () => {
      clearTimeout(lifetime)
      sockets.delete(socket)
      if (healthy)
        record('disconnect', { reason, pendingBytes: session.pendingBytes })
    })
  })
  server.maxConnections = config.GPS_MAX_CONNECTIONS
  return {
    server,
    close: () => {
      for (const socket of sockets) socket.destroy()
      return new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    },
  }
}
