import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  deviceTime,
  mayReply,
  positionSchema,
  requirePacket,
} from './protocol.ts'
import type { ProtocolAdapter } from './protocol.ts'

export function bcd(bytes: Buffer): string {
  const digits = bytes.toString('hex')
  requirePacket(/^\d+$/.test(digits), 'invalid_bcd')
  return digits
}

function xor(bytes: Buffer): number {
  return bytes.reduce((checksum, byte) => checksum ^ byte, 0)
}

export function unescapeJt808(frame: Buffer): Buffer {
  requirePacket(frame[0] === 0x7e && frame.at(-1) === 0x7e, 'invalid_delimiter')
  const result: number[] = []
  for (let i = 1; i < frame.length - 1; i++) {
    const byte = frame[i]
    if (byte === 0x7d) {
      const escape = frame[++i]
      requirePacket(
        i < frame.length - 1 && (escape === 1 || escape === 2),
        'invalid_escape',
      )
      result.push(escape === 1 ? 0x7d : 0x7e)
    } else {
      requirePacket(byte !== 0x7e, 'invalid_delimiter')
      result.push(byte)
    }
  }
  return Buffer.from(result)
}

export function encodeJt808(
  type: number,
  terminal: Buffer,
  serial: number,
  body: Buffer,
  version?: number,
): Buffer {
  const header = Buffer.alloc(version === undefined ? 12 : 17)
  header.writeUInt16BE(type)
  header.writeUInt16BE(body.length | (version === undefined ? 0 : 0x4000), 2)
  let offset = 4
  if (version !== undefined) header[offset++] = version
  terminal.copy(header, offset)
  header.writeUInt16BE(serial, header.length - 2)
  const data = Buffer.concat([header, body])
  const escaped: number[] = [0x7e]
  for (const byte of [...data, xor(data)]) {
    if (byte === 0x7e || byte === 0x7d)
      escaped.push(0x7d, byte === 0x7e ? 2 : 1)
    else escaped.push(byte)
  }
  return Buffer.from([...escaped, 0x7e])
}

// Each TCP connection gets its own adapter: authentication and outgoing sequence
// numbers must never leak between devices or reconnects.
export function createJt808(): ProtocolAdapter {
  let authenticatedId: string | undefined
  let serverSerial = 0
  return {
    id: 'jt808',
    start: 0x7e,
    end: 0x7e,
    decode(frame, context) {
      const data = unescapeJt808(frame)
      requirePacket(data.length >= 13 && xor(data) === 0, 'invalid_checksum')
      const type = data.readUInt16BE(0)
      const props = data.readUInt16BE(2)
      const version = props & 0x4000 ? data[4] : undefined
      const headerSize = version === undefined ? 12 : 17
      const fragmented = Boolean(props & 0x2000)
      const bodyStart = headerSize + (fragmented ? 4 : 0)
      requirePacket(
        data.length === bodyStart + (props & 0x3ff) + 1,
        'invalid_body_length',
      )
      requirePacket((props & 0x8000) === 0, 'invalid_header_flags')
      const terminal = data.subarray(
        version === undefined ? 4 : 5,
        headerSize - 2,
      )
      const deviceId = bcd(terminal)
      const serial = data.readUInt16BE(headerSize - 2)
      const body = data.subarray(bodyStart, -1)
      const result = {
        protocol: 'jt808' as const,
        deviceId,
        type: type.toString(16).padStart(4, '0'),
        supported: false,
        replies: [] as Buffer[],
      }
      // Preserve unsupported packets in the journal without pretending to decode
      // encrypted payloads or acknowledge fragments that were not reassembled.
      if (fragmented || props & 0x1c00) return result
      const reply = (replyType: number, payload: Buffer) => {
        if (mayReply(deviceId, context)) {
          result.replies.push(
            encodeJt808(
              replyType,
              terminal,
              serverSerial++ & 0xffff,
              payload,
              version,
            ),
          )
        }
      }
      const generalReply = (status = 0) => {
        const payload = Buffer.alloc(5)
        payload.writeUInt16BE(serial)
        payload.writeUInt16BE(type, 2)
        payload[4] = status
        reply(0x8001, payload)
      }
      // A deterministic per-device token survives reconnects. It is not the SMS
      // password, and is never written to normal console logs.
      const token = createHmac('sha256', context.authSecret)
        .update(deviceId)
        .digest('hex')
        .slice(0, 32)
      if (type === 0x0100) {
        requirePacket(
          body.length >= (version === undefined ? 25 : 76),
          'invalid_registration',
        )
        authenticatedId = undefined
        const payload = Buffer.alloc(3)
        payload.writeUInt16BE(serial)
        reply(0x8100, Buffer.concat([payload, Buffer.from(token)]))
        result.supported = true
      } else if (type === 0x0102) {
        const auth =
          version === undefined ? body : body.subarray(1, 1 + body[0])
        requirePacket(
          body.length > 0 &&
            (version === undefined || body.length >= 1 + body[0] + 15 + 20),
          'invalid_authentication',
        )
        const expected = Buffer.from(token)
        const accepted =
          auth.length === expected.length && timingSafeEqual(auth, expected)
        authenticatedId = accepted ? deviceId : undefined
        generalReply(accepted ? 0 : 1)
        return { ...result, supported: true, authenticated: accepted }
      } else if (type === 0x0002) {
        // The deployed legacy tracker produced 16-byte frames rejected here.
        // Allow its one-byte body as opaque data and keep it in the raw journal.
        requirePacket(
          body.length === 0 || (version === undefined && body.length === 1),
          'invalid_heartbeat',
        )
        if (authenticatedId === deviceId) generalReply()
        return {
          ...result,
          supported: true,
          authenticated: authenticatedId === deviceId,
        }
      } else if (type === 0x0200) {
        requirePacket(body.length >= 28, 'invalid_location_length')
        const status = body.readUInt32BE(4)
        const time = bcd(body.subarray(22, 28))
        let batteryPercent: number | undefined
        let satellites: number | undefined
        let cellularSignal: number | undefined
        let odometerKm: number | undefined
        for (let offset = 28; offset < body.length;) {
          requirePacket(offset + 2 <= body.length, 'invalid_extension')
          const start = offset + 2
          const end = start + body[offset + 1]
          requirePacket(end <= body.length, 'invalid_extension')
          const kind = body[offset]
          const length = end - start
          if (kind === 0x01 && length === 4) {
            odometerKm = body.readUInt32BE(start) / 10
          } else if (
            kind === 0x30 &&
            length === 1 &&
            body[start] < 255 &&
            body[start] !== 99
          ) {
            cellularSignal = body[start]
          } else if (kind === 0x31 && length === 1 && body[start] < 255) {
            satellites = body[start]
          } else if (kind === 0xeb) {
            // The TK905 BSJ extension prefixes each item with a two-byte length
            // that includes the two-byte subcommand. Other EB layouts stay opaque.
            let candidate: number | undefined
            let item = start
            while (item + 4 <= end) {
              const itemLength = body.readUInt16BE(item)
              const next = item + 2 + itemLength
              if (itemLength < 2 || next > end) break
              if (itemLength === 3 && body.readUInt16BE(item + 2) === 0x00a8) {
                const value = body[item + 4]
                if (value <= 100) candidate = value
              }
              item = next
            }
            if (item === end && candidate !== undefined)
              batteryPercent = candidate
          }
          offset = end
        }
        const position = positionSchema.parse({
          timestamp: deviceTime(
            time.slice(0, 6),
            time.slice(6),
            context.utcOffsetMinutes,
            true,
          ),
          valid: Boolean(status & 2),
          latitude: (body.readUInt32BE(8) / 1e6) * (status & 4 ? -1 : 1),
          longitude: (body.readUInt32BE(12) / 1e6) * (status & 8 ? -1 : 1),
          altitude: body.readUInt16BE(16),
          speedKmh: body.readUInt16BE(18) / 10,
          course: body.readUInt16BE(20),
          batteryPercent,
          satellites,
          cellularSignal,
          odometerKm,
        })
        if (authenticatedId === deviceId) generalReply()
        return {
          ...result,
          supported: true,
          authenticated: authenticatedId === deviceId,
          position,
        }
      }
      return result
    },
  }
}
