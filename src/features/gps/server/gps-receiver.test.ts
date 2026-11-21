// @vitest-environment node
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { createHmac } from 'node:crypto'
import { join } from 'node:path'
import { connect } from 'node:net'
import { EventEmitter, once } from 'node:events'
import { afterEach, expect, it, vi } from 'vitest'
import { readGpsConfig } from './gps-config.ts'
import { createFileJournal } from './gps-journal.server.ts'
import { createGpsReceiver } from './gps-receiver.server.ts'
import { encodeJt808 } from './protocols/jt808.ts'
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

it('withholds the registration reply until database admission succeeds', async () => {
  vi.spyOn(console, 'info').mockImplementation(() => {})
  const records: JournalRecord[] = []
  const admission = new EventEmitter()
  const started = once(admission, 'started')
  const receiver = createGpsReceiver(
    readGpsConfig({
      GPS_DATABASE_URL: 'postgresql://fixture/fixture',
      GPS_PROTOCOL: 'jt808',
      GPS_REPLY: 'true',
      GPS_AUTH_SECRET: 'test-secret-with-more-than-32-characters',
    }),
    {
      write: (record) => {
        records.push(record)
      },
    },
    vi.fn(),
    () => {
      admission.emit('started')
      return once(admission, 'admit').then(() => true)
    },
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
  const response = once(client, 'data')
  client.write(
    encodeJt808(
      0x0100,
      Buffer.from('009590038494', 'hex'),
      1,
      Buffer.alloc(33),
    ),
  )
  await started
  expect(records.map((record) => record.event)).toEqual([
    'connect',
    'receive',
    'frame',
  ])
  admission.emit('admit')
  expect(Buffer.isBuffer((await response)[0])).toBe(true)
  expect(records.at(-1)?.event).toBe('send')
})

it('attributes decode errors only after authentication on that connection', async () => {
  vi.spyOn(console, 'info').mockImplementation(() => {})
  const recordError = vi.fn().mockResolvedValue(undefined)
  const config = readGpsConfig({
    GPS_DATABASE_URL: 'postgresql://fixture/fixture',
    GPS_PROTOCOL: 'jt808',
    GPS_REPLY: 'true',
    GPS_AUTH_SECRET: 'test-secret-with-more-than-32-characters',
  })
  const receiver = createGpsReceiver(
    config,
    { write: vi.fn() },
    vi.fn(),
    async () => true,
    recordError,
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
  const id = '009590038494'
  const frame = (type: number, serial: number, body: Buffer) =>
    encodeJt808(type, Buffer.from(id, 'hex'), serial, body)
  const token = createHmac('sha256', config.GPS_AUTH_SECRET)
    .update(id)
    .digest('hex')
    .slice(0, 32)
  const authenticated = once(client, 'data')
  client.write(
    Buffer.concat([
      frame(0x0002, 1, Buffer.alloc(2)),
      frame(0x0102, 2, Buffer.from(token)),
    ]),
  )
  await authenticated
  expect(recordError).not.toHaveBeenCalled()

  const registered = once(client, 'data')
  client.write(
    Buffer.concat([
      frame(0x0002, 3, Buffer.alloc(2)),
      frame(0x0100, 4, Buffer.alloc(33)),
    ]),
  )
  await registered
  expect(recordError).toHaveBeenCalledExactlyOnceWith(
    id,
    expect.any(Date),
    'invalid_heartbeat',
  )

  const authenticatedAgain = once(client, 'data')
  client.write(
    Buffer.concat([
      frame(0x0002, 5, Buffer.alloc(2)),
      frame(0x0102, 6, Buffer.from(token)),
    ]),
  )
  await authenticatedAgain
  expect(recordError).toHaveBeenCalledTimes(1)
})
