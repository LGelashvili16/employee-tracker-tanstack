// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import {
  createGpsDecodeErrorRecorder,
  createGpsIngest,
} from './gps-ingest.server'
import { gpsHistoryInput, gpsPageSize, gpsSearchSchema } from '../gps.schemas'
import type { Actor } from '#/lib/authorization/actor'
import type { Position } from './protocols/protocol'

vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('#/db', () => ({ db: drizzle({ client }) }))
const url = process.env.GPS_TEST_DATABASE_URL
const client = new Client({ connectionString: url })
const owner: Actor = {
  id: 'gps-test-owner',
  name: 'მფლობელი',
  email: null,
  emailVerified: true,
  roles: ['owner'],
}
const reportedId = '009590038494'
const settings = { name: 'საცდელი მოწყობილობა', reportedId, enabled: true }

beforeAll(async () => {
  if (!url) return
  await client.connect()
  // Refuse to install the fixture in a database containing any application tables.
  const result = await client.query(
    "select count(*)::int as count from pg_tables where schemaname = 'public'",
  )
  if (result.rows[0].count !== 0)
    throw new Error('GPS test requires an empty disposable database')
  await client.query(readFileSync('drizzle/0041_gps_registry.sql', 'utf8'))
  await client.query(
    readFileSync('drizzle/0042_gps_position_history.sql', 'utf8'),
  )
  await client.query(
    readFileSync('drizzle/0043_gps_device_diagnostics.sql', 'utf8'),
  )
})

afterAll(async () => {
  if (url) await client.end()
})

it.skipIf(!url)(
  'registers, persists, deduplicates and reads GPS fixes through the registry',
  async () => {
    const { readGpsWorkspace, saveGpsDevice } =
      await import('./gps-management.service.server')
    const read = () => readGpsWorkspace(owner, gpsSearchSchema.parse({}))
    expect(
      await saveGpsDevice(owner, { ...settings, id: null, version: null }),
    ).toBe(true)
    expect(
      await saveGpsDevice(owner, {
        ...settings,
        reportedId: '9590038494',
        id: null,
        version: null,
      }),
    ).toBe(false)
    const driver = createGpsIngest(drizzle({ client }))
    const newest: Position = {
      timestamp: '2026-11-21T09:00:00.000Z',
      valid: true,
      latitude: 41.7,
      longitude: 44.8,
      speedKmh: 10,
      course: 5,
      altitude: 430,
    }
    const receivedAt = new Date('2026-11-21T09:01:00.000Z')
    const send = (hex: string, position: Position, authenticated = true) =>
      driver(
        {
          protocol: 'jt808',
          type: '0200',
          deviceId: reportedId,
          replies: [],
          supported: true,
          authenticated,
          position,
        },
        hex,
        receivedAt,
      )

    await send('01', newest, false)
    expect((await read()).rows[0].position).toBeNull()
    await send('01', newest)
    await send('01', newest)
    await send('02', {
      ...newest,
      timestamp: '2026-11-21T08:00:00.000Z',
      latitude: 41,
    })
    await send('03', {
      ...newest,
      timestamp: '2026-11-21T09:00:30.000Z',
      valid: false,
      latitude: 42,
    })
    expect(
      (await client.query('select count(*)::int as count from gps_position'))
        .rows[0].count,
    ).toBe(3)
    const [row] = (await read()).rows
    expect(row.lastContactAt).toEqual(receivedAt)
    expect(row.position).toMatchObject({
      latitude: newest.latitude,
      fixAt: new Date(newest.timestamp),
    })
    expect(
      await saveGpsDevice(owner, {
        ...settings,
        id: row.id,
        version: row.version,
        name: 'ახალი სახელი',
        enabled: false,
      }),
    ).toBe(true)
    expect(
      await saveGpsDevice(owner, {
        ...settings,
        id: row.id,
        version: row.version,
      }),
    ).toBe(false)
    expect(await send('04', newest)).toBe(false)
    expect((await read()).rows[0]).toMatchObject({
      id: row.id,
      name: 'ახალი სახელი',
      enabled: false,
      position: row.position,
    })
    expect(
      (
        await client.query(
          'select count(*)::int as count from gps_device_event',
        )
      ).rows[0].count,
    ).toBe(2)

    const viewer: Actor = {
      ...owner,
      roles: ['employee'],
      permissionOverrides: { allow: ['manage.access', 'gps.read'], deny: [] },
    }
    expect(
      (await readGpsWorkspace(viewer, gpsSearchSchema.parse({ q: 'ახალი' })))
        .total,
    ).toBe(1)
    await expect(
      saveGpsDevice(viewer, { ...settings, id: null, version: null }),
    ).rejects.toThrow()
    await expect(
      readGpsWorkspace(
        {
          ...viewer,
          permissionOverrides: { allow: ['manage.access'], deny: [] },
        },
        gpsSearchSchema.parse({}),
      ),
    ).rejects.toThrow()
  },
)

it.skipIf(!url)(
  'reads only the selected tracker and Tbilisi dates with stable paging',
  async () => {
    const { readGpsHistory, saveGpsDevice } =
      await import('./gps-management.service.server')
    await saveGpsDevice(owner, {
      ...settings,
      reportedId: '9590038495',
      id: null,
      version: null,
    })
    await saveGpsDevice(owner, {
      ...settings,
      reportedId: '9590038496',
      id: null,
      version: null,
    })
    const {
      rows: [device, other],
    } = await client.query<{ id: string }>(
      "select id from gps_device where reported_id in ('9590038495','9590038496') order by reported_id",
    )
    await client.query(
      `insert into gps_position
       (device_id, fingerprint, fix_at, received_at, valid, latitude, longitude, speed_kmh, course)
     select $1, n::text, '2026-11-20T20:00:00Z'::timestamptz + n * interval '1 second',
       '2026-11-21T17:00:00Z'::timestamptz, n <> 20, 41.7, 44.8, 0, 0
     from generate_series(-1, 20) n`,
      [device.id],
    )
    await client.query(
      `insert into gps_position
       (device_id, fingerprint, fix_at, received_at, valid, latitude, longitude, speed_kmh, course)
     values
       ($1, 'end', '2026-11-21T20:00:00Z', '2026-11-21T20:00:01Z', true, 41.7, 44.8, 0, 0),
       ($2, 'other', '2026-11-21T16:00:00Z', '2026-11-21T16:00:01Z', true, 42, 44.8, 0, 0)`,
      [device.id, other.id],
    )
    await client.query(
      "update gps_device set last_contact_at = '2026-11-21T20:00:01Z' where id = $1",
      [device.id],
    )
    const search = gpsHistoryInput.parse({
      deviceId: device.id,
      from: '2026-11-21',
      to: '2026-11-21',
      page: 1,
    })
    const first = await readGpsHistory(owner, search)
    const second = await readGpsHistory(owner, { ...search, page: 99 })
    expect(first?.total).toBe(gpsPageSize + 1)
    expect(first?.rows).toHaveLength(gpsPageSize)
    expect(first?.rows[0].valid).toBe(false)
    expect(second?.page).toBe(2)
    expect(second?.rows.map((row) => row.fixAt.toISOString())).toEqual([
      '2026-11-20T20:00:00.000Z',
    ])
    expect(second?.track).toEqual(first?.track)
    expect(first?.device.lastContactAt?.toISOString()).toBe(
      '2026-11-21T20:00:01.000Z',
    )
    expect(first?.latestFix?.fixAt.toISOString()).toBe(
      '2026-11-21T20:00:00.000Z',
    )
    await expect(
      readGpsHistory({ ...owner, roles: ['employee'] }, search),
    ).rejects.toThrow()
  },
)

it.skipIf(!url)(
  'stores only the latest diagnostic by kind and keeps malformed traffic out of last contact',
  async () => {
    const { readGpsDiagnostics, readGpsWorkspace, saveGpsDevice } =
      await import('./gps-management.service.server')
    const id = '9590038497'
    await saveGpsDevice(owner, {
      ...settings,
      reportedId: id,
      id: null,
      version: null,
    })
    const {
      rows: [device],
    } = await readGpsWorkspace(owner, gpsSearchSchema.parse({ q: id }))
    const db = drizzle({ client })
    const ingest = createGpsIngest(db)
    const saveError = createGpsDecodeErrorRecorder(db)
    const send = (type: string, receivedAt: Date, authenticated?: boolean) =>
      ingest(
        {
          protocol: 'jt808',
          deviceId: `00${id}`,
          type,
          supported: true,
          replies: [],
          authenticated,
        },
        '01',
        receivedAt,
      )
    const early = new Date('2026-11-21T10:00:00Z')
    const latest = new Date('2026-11-21T10:01:00Z')
    const errorTime = new Date('2026-11-21T10:02:00Z')
    await send('0100', early)
    await send('0102', early, true)
    await send('0002', latest, true)
    await send('0002', early, true)
    await send('0002', errorTime, false)
    await saveError(`00${id}`, errorTime)
    expect(await readGpsDiagnostics(owner, device.id)).toEqual(
      expect.arrayContaining([
        { kind: 'registration', receivedAt: early },
        { kind: 'authentication', receivedAt: early },
        { kind: 'heartbeat', receivedAt: latest },
        { kind: 'decode_error', receivedAt: errorTime },
      ]),
    )
    expect(await readGpsDiagnostics(owner, device.id)).toHaveLength(4)
    expect(
      (await readGpsWorkspace(owner, gpsSearchSchema.parse({ q: id }))).rows[0]
        .lastContactAt,
    ).toEqual(latest)
    expect(() =>
      readGpsDiagnostics({ ...owner, roles: ['employee'] }, device.id),
    ).toThrow()
  },
)
