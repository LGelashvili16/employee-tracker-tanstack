// @vitest-environment node
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { GpsSession } from './gps-session.ts'
import { createH02, createWatch } from './protocols/ascii.ts'
import { createJt808, encodeJt808, unescapeJt808 } from './protocols/jt808.ts'
import { deviceTime } from './protocols/protocol.ts'
import type { DecodeContext } from './protocols/protocol.ts'

const id = '009590038494'
const terminal = Buffer.from(id, 'hex')
const context: DecodeContext = {
  receivedAt: new Date('2026-11-20T11:00:00Z'),
  utcOffsetMinutes: 0,
  allowedDeviceIds: ['9590038494'],
  reply: true,
  authSecret: 'a-test-secret-with-at-least-32-characters',
}
// Published TK905-4G captures provide independent fixtures, not an encoder/decoder
// round trip. Source: https://www.traccar.org/forums/topic/port-protocol-winnes-tk905-4g/
const registration = Buffer.from(
  '7e010000210095900384940000002c012f373031313145472d30350000003030303030303001d4c1423838383838767e',
  'hex',
)
const location = Buffer.from(
  '7e0200005300959003849400110000000000000003031341e400421982003900000000250219115132010400000000300114310115eb29000c00b28931440301405890920f00060089ffffffff000600c5ffffffef0004002d0f8a000300a859dc7e',
  'hex',
)
const watch = (content: string, index = '') =>
  Buffer.from(
    `[SG*${id}*${index ? `${index}*` : ''}${content.length.toString(16).padStart(4, '0')}*${content}]`,
  )

describe('GPS stream and protocol strategies', () => {
  it('recognizes an independently captured JT808 position and applies an explicit timezone', () => {
    const result = new GpsSession('auto').push(location, {
      ...context,
      utcOffsetMinutes: 480,
    })[0]
    expect(result.decoded).toMatchObject({
      protocol: 'jt808',
      deviceId: id,
      supported: true,
      position: {
        latitude: 51.5937,
        longitude: 4.331906,
        valid: true,
        timestamp: '2025-02-19T03:51:32.000Z',
      },
    })
    expect(result.decoded?.replies).toEqual([])
  })

  it('reassembles every possible two-chunk split of a real registration', () => {
    for (let split = 1; split < registration.length; split++) {
      const session = new GpsSession('auto')
      expect(session.push(registration.subarray(0, split), context)).toEqual([])
      expect(
        session.push(registration.subarray(split), context)[0].decoded?.type,
      ).toBe('0100')
      expect(session.pendingBytes).toBe(0)
    }
  })

  it('drains coalesced packets and shared JT808 flags across separate TCP chunks', () => {
    const session = new GpsSession('auto')
    expect(
      session.push(Buffer.concat([registration, location]), context),
    ).toHaveLength(2)
    expect(session.push(location.subarray(1), context)[0].decoded?.type).toBe(
      '0200',
    )
  })

  it('validates escaping and checksums before issuing any replies', () => {
    const frame = encodeJt808(0x9999, terminal, 0, Buffer.from([0x7e, 0x7d]))
    expect(frame.includes(Buffer.from([0x7d, 2]))).toBe(true)
    expect(frame.includes(Buffer.from([0x7d, 1]))).toBe(true)
    expect(createJt808().decode(frame, context).supported).toBe(false)
    const corrupt = Buffer.from(registration)
    corrupt[20] ^= 1
    expect(new GpsSession('auto').push(corrupt, context)[0]).toMatchObject({
      error: 'invalid_checksum',
    })
    expect(() => unescapeJt808(Buffer.from([0x7e, 0x7d, 3, 0x7e]))).toThrow(
      'invalid_escape',
    )
  })

  it('requires valid authentication before heartbeat and location acknowledgments', () => {
    const decoder = createJt808()
    const registered = decoder.decode(registration, context)
    const reply = unescapeJt808(registered.replies[0])
    expect(reply.readUInt16BE(0)).toBe(0x8100)
    expect(reply.readUInt16BE(12)).toBe(0)
    expect(reply[14]).toBe(0)
    const token = reply.subarray(15, -1)
    expect(
      decoder.decode(
        encodeJt808(0x0102, terminal, 2, Buffer.from('wrong')),
        context,
      ).replies[0],
    ).toEqual(encodeJt808(0x8001, terminal, 1, Buffer.from([0, 2, 1, 2, 1])))
    expect(
      decoder.decode(encodeJt808(0x0002, terminal, 3, Buffer.alloc(0)), context)
        .replies,
    ).toEqual([])
    decoder.decode(encodeJt808(0x0102, terminal, 4, token), context)
    const ack = unescapeJt808(decoder.decode(location, context).replies[0])
    expect(ack.readUInt16BE(0)).toBe(0x8001)
    expect(ack.subarray(12, -1)).toEqual(Buffer.from([0, 17, 2, 0, 0]))
    expect(createJt808().decode(location, context).replies).toEqual([])
  })

  it('supports versioned 2019 headers and rejects unassembled fragments', () => {
    const longId = Buffer.from('00000000009590038494', 'hex')
    const decoder = createJt808()
    const registered = decoder.decode(
      encodeJt808(0x0100, longId, 8, Buffer.alloc(76), 1),
      context,
    )
    expect(unescapeJt808(registered.replies[0])[4]).toBe(1)
    const token = createHmac('sha256', context.authSecret)
      .update(longId.toString('hex'))
      .digest('hex')
      .slice(0, 32)
    expect(
      decoder.decode(
        encodeJt808(
          0x0102,
          longId,
          9,
          Buffer.concat([
            Buffer.from([32]),
            Buffer.from(token),
            Buffer.alloc(35),
          ]),
          1,
        ),
        context,
      ).supported,
    ).toBe(true)
    // Fragmented fixture with a recomputed independent XOR checksum.
    const data = unescapeJt808(registration).subarray(0, -1)
    data.writeUInt16BE(data.readUInt16BE(2) | 0x2000, 2)
    const fragment = Buffer.concat([
      data.subarray(0, 12),
      Buffer.from([0, 2, 0, 1]),
      data.subarray(12),
    ])
    const checksum = fragment.reduce((sum, byte) => sum ^ byte, 0)
    const result = decoder.decode(
      Buffer.concat([
        Buffer.from([0x7e]),
        fragment,
        Buffer.from([checksum, 0x7e]),
      ]),
      context,
    )
    expect(result).toMatchObject({ supported: false, replies: [] })
  })

  it('never responds to unknown devices or in passive mode', () => {
    expect(
      createJt808().decode(registration, {
        ...context,
        allowedDeviceIds: ['1234567890'],
      }).replies,
    ).toEqual([])
    expect(
      createWatch().decode(watch('LK'), { ...context, reply: false }).replies,
    ).toEqual([])
  })

  it('keeps forced protocol selection separate from automatic recognition', () => {
    expect(new GpsSession('watch').push(registration, context)[0].error).toBe(
      'unknown_protocol',
    )
    expect(new GpsSession('raw').push(registration, context)).toEqual([])
    expect(
      new GpsSession('auto').push(Buffer.from('unrecognized'), context)[0]
        .error,
    ).toBe('unknown_protocol')
  })

  it('handles split Watch messages, echoes the index, and checks declared lengths', () => {
    const frame = watch('LK,0,55', '0012')
    const session = new GpsSession('auto')
    expect(session.push(frame.subarray(0, 2), context)).toEqual([])
    const result = session.push(
      Buffer.concat([frame.subarray(2), watch('LK')]),
      context,
    )
    expect(result).toHaveLength(2)
    expect(result[0].decoded?.replies[0].toString()).toBe(
      `[SG*${id}*0012*0002*LK]`,
    )
    expect(() =>
      createWatch().decode(Buffer.from(`[SG*${id}*0003*LK]`), context),
    ).toThrow('invalid_body_length')
  })

  it('decodes Watch decimal degrees and H02 degrees/minutes without mixing them', () => {
    const result = createWatch().decode(
      watch(
        'UD,201126,103700,A,41.718652,N,44.740837,E,10,90,20,15,31,63,0,0,00000000',
      ),
      context,
    )
    expect(result.position).toMatchObject({
      latitude: 41.718652,
      longitude: 44.740837,
      batteryPercent: 63,
      speedKmh: 18.52,
    })
    const h02 = createH02().decode(
      Buffer.from(
        `*HQ,${id},V1,103700,A,4143.11912,N,04444.45022,E,10,90,201126,FFFFBBFF#`,
      ),
      context,
    )
    expect(h02.position?.latitude).toBeCloseTo(41.718652)
    expect(h02.position?.longitude).toBeCloseTo(44.740837)
    expect(h02.replies[0].toString()).toBe(`*HQ,${id},V4,V1,20261120110000#`)
    expect(
      createH02().decode(Buffer.from(`*HQ,${id},V5,unsupported#`), context)
        .supported,
    ).toBe(false)
  })

  it('rejects impossible dates, coordinates, and oversized partial frames', () => {
    expect(() => deviceTime('310226', '103700', 0)).toThrow('invalid_timestamp')
    expect(() => deviceTime('201126', '246000', 0)).toThrow('invalid_timestamp')
    expect(() =>
      createWatch().decode(
        watch('UD,201126,103700,A,999,N,44,E,0,0,0,0,0,0,0'),
        context,
      ),
    ).toThrow()
    const session = new GpsSession('auto', 32)
    session.push(Buffer.from('[SG*'), context)
    expect(() => session.push(Buffer.alloc(33), context)).toThrow(
      'buffer_limit',
    )
  })

  it('rejects malformed JT808 body lengths, BCD and extension lengths', () => {
    const invalidId = Buffer.from('0095a0038494', 'hex')
    expect(() =>
      createJt808().decode(
        encodeJt808(2, invalidId, 0, Buffer.alloc(0)),
        context,
      ),
    ).toThrow('invalid_bcd')
    const body = unescapeJt808(location).subarray(12, -1)
    expect(() =>
      createJt808().decode(
        encodeJt808(0x0200, terminal, 0, body.subarray(0, 29)),
        context,
      ),
    ).toThrow('invalid_extension')
    expect(() =>
      createJt808().decode(
        encodeJt808(0x0200, terminal, 0, Buffer.alloc(10)),
        context,
      ),
    ).toThrow('invalid_location_length')
  })
})
