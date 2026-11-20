import {
  decimal,
  deviceTime,
  mayReply,
  positionSchema,
  requirePacket,
} from './protocol.ts'
import type { ProtocolAdapter } from './protocol.ts'

function ascii(frame: Buffer): string {
  requirePacket(
    frame.every((byte) => byte >= 0x20 && byte <= 0x7e),
    'invalid_ascii',
  )
  return frame.toString('ascii')
}

function nmea(value: string, hemisphere: string): number {
  const number = decimal(value)
  const degrees = Math.floor(number / 100)
  const minutes = number - degrees * 100
  requirePacket(number >= 0 && minutes < 60, 'invalid_coordinate')
  return (
    (degrees + minutes / 60) *
    (hemisphere === 'S' || hemisphere === 'W' ? -1 : 1)
  )
}

export function createH02(): ProtocolAdapter {
  return {
    id: 'h02',
    start: 0x2a,
    end: 0x23,
    decode(frame, context) {
      const match = /^\*HQ,(\d{5,20}),([A-Z0-9]+),(.*)#$/.exec(ascii(frame))
      requirePacket(match, 'invalid_h02_header')
      const [, deviceId, type, content] = match
      const result = {
        protocol: 'h02' as const,
        deviceId,
        type,
        supported: false,
        replies: [] as Buffer[],
      }
      // H02 V4 and V5 variants have different layouts; never parse them using V1
      // offsets merely because the frame has the same delimiters.
      if (type !== 'V1') return result
      const fields = content.split(',')
      requirePacket(
        fields.length >= 9 &&
          /^[AV]$/.test(fields[1]) &&
          /^[NS]$/.test(fields[3]) &&
          /^[EW]$/.test(fields[5]),
        'invalid_h02_location',
      )
      const position = positionSchema.parse({
        timestamp: deviceTime(fields[8], fields[0], context.utcOffsetMinutes),
        valid: fields[1] === 'A',
        latitude: nmea(fields[2], fields[3]),
        longitude: nmea(fields[4], fields[5]),
        speedKmh: decimal(fields[6]) * 1.852,
        course: decimal(fields[7]),
      })
      if (mayReply(deviceId, context)) {
        const now = context.receivedAt
          .toISOString()
          .replace(/[-:T]/g, '')
          .slice(0, 14)
        result.replies.push(Buffer.from(`*HQ,${deviceId},V4,V1,${now}#`))
      }
      return { ...result, supported: true, position }
    },
  }
}

export function createWatch(): ProtocolAdapter {
  return {
    id: 'watch',
    start: 0x5b,
    end: 0x5d,
    decode(frame, context) {
      const match =
        /^\[([A-Z0-9]{2})\*(\d{5,20})\*(?:([A-Fa-f0-9]{4})\*)?([A-Fa-f0-9]{4})\*(.*)\]$/.exec(
          ascii(frame),
        )
      requirePacket(match, 'invalid_watch_header')
      const [, manufacturer, deviceId, index, length, content] = match
      requirePacket(
        Number.parseInt(length, 16) === Buffer.byteLength(content),
        'invalid_body_length',
      )
      const [type, ...fields] = content.split(',')
      const result = {
        protocol: 'watch' as const,
        deviceId,
        type,
        supported: false,
        replies: [] as Buffer[],
      }
      const reply = (payload: string) => {
        if (mayReply(deviceId, context)) {
          result.replies.push(
            Buffer.from(
              `[${manufacturer}*${deviceId}*${index ? `${index}*` : ''}${Buffer.byteLength(payload).toString(16).padStart(4, '0')}*${payload}]`,
            ),
          )
        }
      }
      if (
        type === 'LK' ||
        type === 'INIT' ||
        type === 'TKQ' ||
        type === 'TKQ2'
      ) {
        reply(type === 'INIT' ? 'INIT,1' : type)
        result.supported = true
      } else if (['UD', 'UD2', 'AL', 'AL2', 'WT'].includes(type)) {
        requirePacket(
          fields.length >= 14 &&
            /^[AV]$/.test(fields[2]) &&
            /^[NS]$/.test(fields[4]) &&
            /^[EW]$/.test(fields[6]),
          'invalid_watch_location',
        )
        const position = positionSchema.parse({
          timestamp: deviceTime(fields[0], fields[1], context.utcOffsetMinutes),
          valid: fields[2] === 'A',
          latitude: decimal(fields[3]) * (fields[4] === 'S' ? -1 : 1),
          longitude: decimal(fields[5]) * (fields[6] === 'W' ? -1 : 1),
          speedKmh: decimal(fields[7]) * 1.852,
          course: decimal(fields[8]),
          altitude: decimal(fields[9]),
          batteryPercent: decimal(fields[12]),
        })
        if (type.startsWith('AL')) reply('AL')
        return { ...result, supported: true, position }
      }
      return result
    },
  }
}
