import { z } from 'zod'

export const protocolIds = ['jt808', 'watch', 'h02'] as const
export type ProtocolId = (typeof protocolIds)[number]
export type ProtocolMode = ProtocolId | 'auto' | 'raw'

export const positionSchema = z.object({
  timestamp: z.iso.datetime({ message: 'დროის ფორმატი არასწორია' }),
  valid: z.boolean(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).max(2000),
  course: z.number().min(0).max(360),
  altitude: z.number().optional(),
  batteryPercent: z.number().min(0).max(100).optional(),
})
export type Position = z.infer<typeof positionSchema>

export interface DecodeContext {
  receivedAt: Date
  utcOffsetMinutes: number
  // Device IDs are not credentials. This is an allowlist for diagnostic replies.
  allowedDeviceIds: readonly string[]
  reply: boolean
  authSecret: string
  /** Database mode authorizes actual replies after decoding and committing. */
  deferReplyAdmission?: boolean
}

export interface DecodedMessage {
  protocol: ProtocolId
  deviceId: string
  type: string
  supported: boolean
  authenticated?: boolean
  position?: Position
  replies: Buffer[]
}

export interface ProtocolAdapter {
  id: ProtocolId
  start: number
  end: number
  decode: (frame: Buffer, context: DecodeContext) => DecodedMessage
}

export const decodedMessageSchema = z.object({
  protocol: z.enum(protocolIds),
  deviceId: z.string().regex(/^\d{5,20}$/),
  type: z.string().min(1).max(32),
  supported: z.boolean(),
  authenticated: z.boolean().optional(),
  position: positionSchema.optional(),
  replies: z.array(z.instanceof(Buffer)).max(2),
})

export class PacketError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

export function canonicalDeviceId(id: string): string {
  return id.replace(/^0+(?=\d)/, '')
}

export function mayReply(id: string, context: DecodeContext): boolean {
  return (
    context.reply &&
    (context.deferReplyAdmission === true ||
      context.allowedDeviceIds.some(
        (allowed) => canonicalDeviceId(allowed) === canonicalDeviceId(id),
      ))
  )
}

export function requirePacket(
  condition: unknown,
  code: string,
): asserts condition {
  if (!condition) throw new PacketError(code)
}

export function decimal(value: string): number {
  requirePacket(/^-?\d+(\.\d+)?$/.test(value), 'invalid_number')
  return Number(value)
}

// Decode the device's wall clock using an explicit offset, never the host timezone.
export function deviceTime(
  date: string,
  time: string,
  offset: number,
  yearFirst = false,
): string {
  requirePacket(
    /^\d{6}$/.test(date) && /^\d{6}$/.test(time),
    'invalid_timestamp',
  )
  const year = 2000 + Number(date.slice(yearFirst ? 0 : 4, yearFirst ? 2 : 6))
  const month = Number(date.slice(2, 4))
  const day = Number(date.slice(yearFirst ? 4 : 0, yearFirst ? 6 : 2))
  const hour = Number(time.slice(0, 2))
  const minute = Number(time.slice(2, 4))
  const second = Number(time.slice(4, 6))
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  requirePacket(
    wall.getUTCFullYear() === year &&
      wall.getUTCMonth() === month - 1 &&
      wall.getUTCDate() === day &&
      hour < 24 &&
      minute < 60 &&
      second < 60,
    'invalid_timestamp',
  )
  return new Date(wall.getTime() - offset * 60_000).toISOString()
}
