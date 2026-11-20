// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'

it('replays split frames across files using the actual CLI without network replies', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gps-replay-'))
  try {
    const first = join(directory, 'first.jsonl')
    const second = join(directory, 'second.jsonl')
    const frame = '[SG*9590038494*0002*LK]'
    const record = (chunk: string) =>
      `${JSON.stringify({
        event: 'receive',
        connection: 'test',
        receivedAt: '2026-11-20T10:00:00.000Z',
        hex: Buffer.from(chunk).toString('hex'),
      })}\n`
    writeFileSync(first, record(frame.slice(0, 10)))
    writeFileSync(second, record(frame.slice(10)))
    const output = execFileSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/gps-replay.ts', first, second],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          GPS_PROTOCOL: 'auto',
          GPS_REPLY: 'false',
          GPS_DEVICE_IDS: '',
        },
      },
    )
    const result = JSON.parse(output.trim())
    expect(result.decoded).toMatchObject({
      protocol: 'watch',
      deviceId: '9590038494',
      type: 'LK',
      supported: true,
    })
    expect(result.decoded).not.toHaveProperty('replies')
    expect(result.hex).toBe(Buffer.from(frame).toString('hex'))
    const forced = execFileSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/gps-replay.ts', second],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          GPS_PROTOCOL: 'jt808',
          GPS_REPLY: 'false',
          GPS_DEVICE_IDS: '',
        },
      },
    )
    expect(JSON.parse(forced.trim()).error).toBe('unknown_protocol')
  } finally {
    rmSync(directory, { recursive: true })
  }
})
