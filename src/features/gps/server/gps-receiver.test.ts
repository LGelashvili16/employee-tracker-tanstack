// @vitest-environment node
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { connect } from 'node:net'
import { once } from 'node:events'
import { afterEach, expect, it, vi } from 'vitest'
import { readGpsConfig } from './gps-config.ts'
import { createFileJournal } from './gps-journal.server.ts'
import { createGpsReceiver } from './gps-receiver.server.ts'
import type { JournalRecord } from './gps-journal.server.ts'

const cleanup: Array<() => unknown> = []
afterEach(async () => {
  for (const dispose of cleanup.splice(0).reverse()) await dispose()
  vi.restoreAllMocks()
})

it('validates configuration without echoing secrets or accepting ambiguous flags', () => {
  expect(() => readGpsConfig({ GPS_PORT: '0' })).toThrow('GPS_PORT')
  expect(() => readGpsConfig({ GPS_REPLY: 'yes' })).toThrow('GPS_REPLY')
  expect(() => readGpsConfig({ GPS_REPLY: 'true' })).toThrow('GPS_REPLY')
  expect(() => readGpsConfig({ GPS_DEVICE_IDS: 'not-an-id' })).toThrow(
    'GPS_DEVICE_IDS',
  )
  expect(readGpsConfig({}).GPS_REPLY).toBe(false)
})

it('rotates private recordings within the configured file budget', () => {
  const directory = mkdtempSync(join(tmpdir(), 'gps-journal-'))
  cleanup.push(() => rmSync(directory, { recursive: true }))
  const journal = createFileJournal(directory, 256, 3)
  for (let i = 0; i < 20; i++)
    journal.write({
      event: 'receive',
      connection: String(i),
      receivedAt: new Date().toISOString(),
      hex: 'ab'.repeat(50),
    })
  const files = readdirSync(directory)
  expect(files).toHaveLength(3)
  expect(
    files.every((file) => statSync(join(directory, file)).size <= 256),
  ).toBe(true)
  expect(readFileSync(join(directory, 'journal.jsonl'), 'utf8')).toContain(
    '"connection":"19"',
  )
})

it('records actual TCP bytes before decoding and replying, then closes cleanly', async () => {
  vi.spyOn(console, 'info').mockImplementation(() => {})
  const records: JournalRecord[] = []
  const fatal = vi.fn()
  const receiver = createGpsReceiver(
    readGpsConfig({
      GPS_PROTOCOL: 'auto',
      GPS_REPLY: 'true',
      GPS_DEVICE_IDS: '9590038494',
      GPS_AUTH_SECRET: 'test-secret-with-more-than-32-characters',
    }),
    {
      write: (record) => {
        records.push(record)
      },
    },
    fatal,
  )
  receiver.server.listen(0, '127.0.0.1')
  await once(receiver.server, 'listening')
  cleanup.push(() => receiver.close())
  const address = receiver.server.address()
  if (!address || typeof address === 'string')
    throw new Error('missing_test_port')
  const client = connect(address.port, '127.0.0.1')
  cleanup.push(() => client.destroy())
  await once(client, 'connect')
  client.write('[SG*9590038494*')
  const response = once(client, 'data')
  client.write('0002*LK]')
  expect((await response)[0].toString()).toBe('[SG*9590038494*0002*LK]')
  expect(
    records
      .filter((record) => record.event === 'receive')
      .map((record) => record.hex)
      .join(''),
  ).toBe(Buffer.from('[SG*9590038494*0002*LK]').toString('hex'))
  expect(
    records.findIndex((record) => record.event === 'receive'),
  ).toBeLessThan(records.findIndex((record) => record.event === 'send'))
  expect(fatal).not.toHaveBeenCalled()
})

it('fails closed on journal failure instead of acknowledging unrecorded bytes', async () => {
  const fatal = vi.fn()
  const receiver = createGpsReceiver(
    readGpsConfig({}),
    {
      write: () => {
        throw new Error('disk_full')
      },
    },
    fatal,
  )
  receiver.server.listen(0, '127.0.0.1')
  await once(receiver.server, 'listening')
  const address = receiver.server.address()
  if (!address || typeof address === 'string')
    throw new Error('missing_test_port')
  const client = connect(address.port, '127.0.0.1')
  client.on('error', () => {})
  await once(client, 'close')
  expect(fatal).toHaveBeenCalledOnce()
  expect(receiver.server.listening).toBe(false)
})
