// @vitest-environment node
import 'dotenv/config'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import pg from 'pg'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type * as Service from './jobs.service.server'
import type { db as Database } from '#/db'
import type { Actor } from '#/lib/authorization/actor'
import type { LocationFeature } from '../job-locations.types'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const geocoder = vi.hoisted(() => ({ enabled: false, request: vi.fn() }))
vi.mock('#/server/integrations/geocoding.server', () => ({
  geocodingConfiguration: () => ({
    enabled: geocoder.enabled,
    baseUrl: 'https://geocoder.test',
  }),
  requestGeocoding: geocoder.request,
  GeocodingUnavailableError: class extends Error {},
}))
const enabled = process.env.RUN_JOBS_DB_TESTS === '1'
const originalUrl = process.env.DATABASE_URL
const databaseName = `teamwork_jobs_test_${randomBytes(8).toString('hex')}`
let admin: pg.Client | undefined
let connection: pg.Client | undefined
let database: typeof Database | undefined
let service: typeof Service
let created = false
const actor = (id: string, roles: Actor['roles'] = ['employee']): Actor => ({
  id,
  roles,
  name: 'ტესტი',
  email: null,
  emailVerified: false,
})
const manager = {
  ...actor('jobs-manager', ['supervisor']),
  name: 'წარმოების უფროსი',
}
const worker = {
  ...actor('jobs-worker', ['production_specialist']),
  name: 'წარმოების სპეციალისტი',
}
const other = actor('jobs-other', ['production_specialist'])
const ordinaryEmployee = actor('jobs-reader')
const platformAdmin = {
  ...actor('jobs-admin', ['admin']),
  name: 'ადმინისტრატორი',
}
const production = actor('jobs-production', ['production_specialist'])
const fields = {
  title: 'სატესტო მონტაჟი',
  notes: 'ინსტრუქცია',
  address: 'თბილისი',
  kind: 'installation',
  deadline: null,
  longitude: 44.8,
  latitude: 41.7,
}
const search = {
  q: '',
  status: 'all',
  kind: 'all',
  scope: 'all',
  sort: 'newest',
  page: 1,
  view: 'map',
}
function sql() {
  if (!connection) throw new Error('Isolated database unavailable')
  return connection
}
async function createPin(overrides = {}) {
  return service.createCompanyJob(manager, {
    ...fields,
    requestId: randomUUID(),
    ...overrides,
  })
}
async function detail(id: string) {
  return service.getCompanyJob(worker, { id })
}
async function transition(id: string, status: string, by = worker, note = '') {
  const record = await detail(id)
  return service.transitionCompanyJob(by, {
    id,
    version: record.version,
    status,
    note,
  })
}

describe.runIf(enabled)('jobs map against isolated PostgreSQL', () => {
  beforeAll(async () => {
    if (!originalUrl) throw new Error('Local PostgreSQL configuration required')
    const target = new URL(originalUrl)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
      throw new Error('Tests require local PostgreSQL')
    admin = new pg.Client({
      connectionString: originalUrl,
      connectionTimeoutMillis: 3000,
    })
    await admin.connect()
    expect(
      Number(
        (await admin.query('show server_version_num')).rows[0]
          .server_version_num,
      ),
    ).toBeGreaterThanOrEqual(180000)
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    created = true
    target.pathname = `/${databaseName}`
    connection = new pg.Client({ connectionString: target.toString() })
    await connection.connect()
    for (const file of readdirSync('drizzle')
      .filter((value) => /^\d+.*\.sql$/.test(value))
      .sort())
      await sql().query(
        readFileSync(`drizzle/${file}`, 'utf8').replaceAll(
          '--> statement-breakpoint',
          '',
        ),
      )
    process.env.DATABASE_URL = target.toString()
    service = await import('./jobs.service.server')
    database = (await import('#/db')).db
    for (const identity of [
      manager,
      worker,
      other,
      ordinaryEmployee,
      platformAdmin,
      production,
    ])
      await sql().query(
        'INSERT INTO "user" (id, name, email, roles) VALUES ($1, $2, $3, $4)',
        [
          identity.id,
          identity.name,
          `${identity.id}@jobs.invalid`,
          identity.roles.join(','),
        ],
      )
    await sql().query(
      "INSERT INTO employee (username, user_id, full_name) VALUES ('jobs-worker', 'jobs-worker', 'თანამშრომელი'), ('jobs-other', 'jobs-other', 'სხვა თანამშრომელი')",
    )
  }, 30_000)
  beforeEach(async () => {
    await sql().query('TRUNCATE job_event, job')
    await sql().query('TRUNCATE job_geocoding_cache, job_geocoding_gate')
    geocoder.enabled = false
    geocoder.request.mockReset()
  })
  afterAll(async () => {
    await database?.$client.end()
    await connection?.end()
    process.env.DATABASE_URL = originalUrl
    if (admin) {
      if (created)
        await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`)
      await admin.end()
    }
  })
  it('rejects unauthenticated direct service calls and employee creation/editing', async () => {
    const { id } = await createPin()
    await expect(service.listCompanyJobs(null, search)).rejects.toThrow(
      'წვდომა',
    )
    await expect(service.getCompanyJob(null, { id })).rejects.toThrow('წვდომა')
    await expect(
      service.createCompanyJob(null, { ...fields, requestId: randomUUID() }),
    ).rejects.toThrow('წვდომა')
    await expect(
      service.createCompanyJob(worker, { ...fields, requestId: randomUUID() }),
    ).rejects.toThrow('წვდომა')
    await expect(
      service.editCompanyJob(worker, { ...fields, id, version: 1 }),
    ).rejects.toThrow('წვდომა')
    await expect(
      service.transitionCompanyJob(null, {
        id,
        version: 1,
        status: 'en_route',
        note: '',
      }),
    ).rejects.toThrow('წვდომა')
    expect((await service.listCompanyJobs(platformAdmin, search)).total).toBe(1)
    await expect(
      service.createCompanyJob(platformAdmin, {
        ...fields,
        requestId: randomUUID(),
      }),
    ).rejects.toThrow('წვდომა')
  })
  it('stores unlocated jobs without geocoding and permits production staff to read and progress their own work', async () => {
    geocoder.enabled = true
    const { id } = await createPin({ longitude: null, latitude: null })
    expect(geocoder.request).not.toHaveBeenCalled()
    expect(await service.getCompanyJob(production, { id })).toMatchObject({
      longitude: null,
      latitude: null,
    })
    const result = await service.listCompanyJobs(production, search)
    expect(result).toMatchObject({
      total: 1,
      unmappedTotal: 1,
      mapTruncated: false,
      markers: [],
    })
    expect(result.items[0].id).toBe(id)
    await expect(
      service.createCompanyJob(production, {
        ...fields,
        requestId: randomUUID(),
      }),
    ).rejects.toThrow('წვდომა')
    await expect(
      service.editCompanyJob(production, { ...fields, id, version: 1 }),
    ).rejects.toThrow('წვდომა')
    await transition(id, 'en_route', production)
    await transition(id, 'on_site', production)
    await transition(id, 'completed', production)
    expect(await detail(id)).toMatchObject({
      status: 'completed',
      assigneeId: production.id,
    })
  })
  it('rejects direct claims without a current production or administrator grant', async () => {
    const { id } = await createPin()
    const forgedProduction: Actor = {
      ...ordinaryEmployee,
      roles: ['production_specialist'],
    }
    for (const by of [manager, ordinaryEmployee, forgedProduction])
      await expect(transition(id, 'en_route', by)).rejects.toThrow('წვდომა')
    await sql().query('UPDATE "user" SET roles = $1 WHERE id = $2', [
      'employee',
      worker.id,
    ])
    try {
      await expect(transition(id, 'en_route', worker)).rejects.toThrow('წვდომა')
    } finally {
      await sql().query('UPDATE "user" SET roles = $1 WHERE id = $2', [
        'production_specialist',
        worker.id,
      ])
    }
    expect(await detail(id)).toMatchObject({
      status: 'pending',
      version: 1,
      assigneeId: null,
    })
    expect((await detail(id)).history).toHaveLength(1)
    await transition(id, 'en_route', platformAdmin)
    expect(await detail(id)).toMatchObject({
      status: 'en_route',
      assigneeId: platformAdmin.id,
    })
  })
  it('records the trusted person for every edit and status change and returns the names in details', async () => {
    const { id } = await createPin()
    await service.editCompanyJob(manager, {
      ...fields,
      id,
      version: 1,
      notes: 'განახლებული ინსტრუქცია',
    })
    await service.transitionCompanyJob(
      { ...worker, name: 'არასწორი სახელი' },
      {
        id,
        version: 2,
        status: 'en_route',
        note: '',
        actorId: manager.id,
      },
    )
    await transition(id, 'on_site', worker)
    await transition(id, 'completed', manager, 'შესრულება გადამოწმებულია')
    const events = (
      await sql().query(
        'SELECT actor_id, action, status FROM job_event WHERE job_id = $1 ORDER BY created_at, id',
        [id],
      )
    ).rows
    expect(events).toEqual([
      { actor_id: manager.id, action: 'created', status: 'pending' },
      { actor_id: manager.id, action: 'edited', status: 'pending' },
      { actor_id: worker.id, action: 'status_changed', status: 'en_route' },
      { actor_id: worker.id, action: 'status_changed', status: 'on_site' },
      { actor_id: manager.id, action: 'status_changed', status: 'completed' },
    ])
    const record = await detail(id)
    expect(
      record.history.map((event) => ({
        action: event.action,
        status: event.status,
        actorName: event.actorName,
      })),
    ).toEqual([
      {
        action: 'status_changed',
        status: 'completed',
        actorName: manager.name,
      },
      { action: 'status_changed', status: 'on_site', actorName: worker.name },
      { action: 'status_changed', status: 'en_route', actorName: worker.name },
      { action: 'edited', status: 'pending', actorName: manager.name },
      { action: 'created', status: 'pending', actorName: manager.name },
    ])
    expect(
      record.history.every(
        (event) => !Number.isNaN(Date.parse(event.createdAt)),
      ),
    ).toBe(true)
  })
  it('adds or removes a job location and clears stale street names atomically', async () => {
    const { id } = await createPin({ longitude: null, latitude: null })
    await service.editCompanyJob(manager, { ...fields, id, version: 1 })
    expect(
      (await service.listCompanyJobs(worker, search)).markers.map(
        (item) => item.id,
      ),
    ).toEqual([id])
    await sql().query(
      'UPDATE job SET street_name_ka = $1, street_name_en = $2 WHERE id = $3',
      ['ძველი ქუჩა', 'Old street', id],
    )
    await service.editCompanyJob(manager, {
      ...fields,
      id,
      version: 2,
      longitude: null,
      latitude: null,
    })
    expect(await detail(id)).toMatchObject({
      longitude: null,
      latitude: null,
      streetNameKa: null,
      streetNameEn: null,
      locationResolvedAt: null,
      version: 3,
    })
    expect(await service.listCompanyJobs(worker, search)).toMatchObject({
      markers: [],
      total: 1,
      unmappedTotal: 1,
      mapTruncated: false,
    })
    await expect(
      sql().query('UPDATE job SET longitude = 44.8 WHERE id = $1', [id]),
    ).rejects.toThrow('job_coordinates_valid')
  })
  it('reloads stored grants and rejects suspended or inactive actors', async () => {
    await expect(
      service.createCompanyJob(
        { ...worker, roles: ['owner'] },
        { ...fields, requestId: randomUUID() },
      ),
    ).rejects.toThrow('წვდომა')
    await sql().query(
      "UPDATE employee SET status = 'inactive' WHERE user_id = 'jobs-worker'",
    )
    try {
      await expect(service.listCompanyJobs(worker, search)).rejects.toThrow(
        'წვდომა',
      )
    } finally {
      await sql().query(
        "UPDATE employee SET status = 'active' WHERE user_id = 'jobs-worker'",
      )
    }
    await sql().query(
      "UPDATE \"user\" SET access_state = 'suspended' WHERE id = 'jobs-manager'",
    )
    try {
      await expect(createPin()).rejects.toThrow('წვდომა')
    } finally {
      await sql().query(
        "UPDATE \"user\" SET access_state = 'active' WHERE id = 'jobs-manager'",
      )
    }
    await sql().query(
      "UPDATE \"user\" SET roles = 'employee' WHERE id = 'jobs-manager'",
    )
    try {
      await expect(createPin()).rejects.toThrow('წვდომა')
    } finally {
      await sql().query(
        "UPDATE \"user\" SET roles = 'supervisor' WHERE id = 'jobs-manager'",
      )
    }
  })
  it('deduplicates concurrent creation retries and records only one creation event', async () => {
    const requestId = randomUUID()
    const results = await Promise.all([
      createPin({ requestId }),
      createPin({ requestId }),
    ])
    expect(results[0].id).toBe(results[1].id)
    const record = await detail(results[0].id)
    expect(record.history).toHaveLength(1)
    expect((await service.listCompanyJobs(worker, search)).total).toBe(1)
    expect(record).not.toHaveProperty('requestId')
  })
  it('serializes concurrent claims and forbids another employee from progressing the task', async () => {
    const { id } = await createPin()
    const results = await Promise.allSettled(
      [worker, other].map((by) =>
        service.transitionCompanyJob(by, {
          id,
          version: 1,
          status: 'en_route',
          note: '',
        }),
      ),
    )
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    const record = await detail(id)
    const outsider = record.assigneeId === worker.id ? other : worker
    await expect(
      service.transitionCompanyJob(outsider, {
        id,
        version: record.version,
        status: 'on_site',
        note: '',
      }),
    ).rejects.toThrow('წვდომა')
    expect(record.history).toHaveLength(2)
    expect(record.version).toBe(2)
  })
  it('requires arrival, completes work, locks edits and reopens with an audited reason', async () => {
    const { id } = await createPin()
    await transition(id, 'en_route')
    await expect(transition(id, 'completed')).rejects.toThrow('წვდომა')
    await transition(id, 'on_site', worker, 'მივედი ობიექტზე')
    await transition(id, 'completed', manager, 'სამუშაო დასრულებულია')
    let record = await detail(id)
    expect(record.assigneeId).toBe(worker.id)
    await expect(
      service.editCompanyJob(manager, {
        ...fields,
        id,
        version: record.version,
      }),
    ).rejects.toThrow('თავიდან დაგეგმეთ')
    await expect(
      transition(id, 'pending', worker, 'თავიდან დაგეგმვა'),
    ).rejects.toThrow('წვდომა')
    await expect(transition(id, 'pending', manager)).rejects.toThrow(
      'მოთხოვნა არასწორია',
    )
    await transition(id, 'pending', manager, 'განმეორებითი მონტაჟი')
    record = await detail(id)
    expect(record.assigneeId).toBeNull()
    expect(record.status).toBe('pending')
    expect(record.history[0].note).toBe('განმეორებითი მონტაჟი')
  })
  it('rejects stale edits and validates direct malformed input', async () => {
    const { id } = await createPin()
    await service.editCompanyJob(manager, {
      ...fields,
      id,
      version: 1,
      kind: 'measurement',
      title: 'ახალი აზომვა',
    })
    await expect(
      service.editCompanyJob(manager, { ...fields, id, version: 1 }),
    ).rejects.toThrow('უკვე შეიცვალა')
    await expect(createPin({ latitude: 100 })).rejects.toThrow(
      'მოთხოვნა არასწორია',
    )
    await expect(
      service.listCompanyJobs(worker, { ...search, page: -1 }),
    ).rejects.toThrow('მოთხოვნა არასწორია')
    await expect(service.getCompanyJob(worker, { id: 'bad' })).rejects.toThrow(
      'მოთხოვნა არასწორია',
    )
    const record = await detail(id)
    expect(record.title).toBe('ახალი აზომვა')
    expect(record.history[0].action).toBe('edited')
  })
  it('persists calendar deadlines through reads, audited edits and explicit clearing without changing their day', async () => {
    const { id } = await createPin({ deadline: '2026-11-20' })
    expect(await detail(id)).toMatchObject({
      deadline: '2026-11-20',
      creatorName: manager.name,
    })
    expect(
      (await service.listCompanyJobs(worker, search)).items[0].deadline,
    ).toBe('2026-11-20')
    await service.editCompanyJob(manager, {
      ...fields,
      id,
      version: 1,
      deadline: '2026-12-15',
    })
    const current = await detail(id)
    expect(current).toMatchObject({ deadline: '2026-12-15', version: 2 })
    expect(current.history[0]).toMatchObject({
      action: 'edited',
      actorName: manager.name,
    })
    await expect(
      service.editCompanyJob(manager, {
        ...fields,
        id,
        version: 1,
        deadline: '2026-12-30',
      }),
    ).rejects.toThrow('უკვე შეიცვალა')
    const { deadline: _deadline, ...withoutDeadline } = fields
    await expect(
      service.editCompanyJob(manager, { ...withoutDeadline, id, version: 2 }),
    ).rejects.toThrow('მოთხოვნა არასწორია')
    await expect(
      service.editCompanyJob(production, {
        ...fields,
        id,
        version: 2,
        deadline: null,
      }),
    ).rejects.toThrow('წვდომა')
    await expect(createPin({ deadline: '2026-02-30' })).rejects.toThrow(
      'მოთხოვნა არასწორია',
    )
    await expect(
      sql().query("UPDATE job SET deadline = '2101-01-01' WHERE id = $1", [id]),
    ).rejects.toThrow('job_deadline_valid')
    expect((await detail(id)).deadline).toBe('2026-12-15')
    await service.editCompanyJob(manager, {
      ...fields,
      id,
      version: 2,
      deadline: null,
    })
    expect(await detail(id)).toMatchObject({ deadline: null, version: 3 })
    expect((await detail(id)).history).toHaveLength(3)
    expect((await detail((await createPin()).id)).deadline).toBeNull()
  })
  it('blocks foreign creates and location edits through direct service calls', async () => {
    const { id } = await createPin()
    const foreign = { longitude: 44.681, latitude: 43.024 }
    await expect(createPin(foreign)).rejects.toThrow('მოთხოვნა არასწორია')
    await expect(
      service.editCompanyJob(manager, {
        ...fields,
        ...foreign,
        id,
        version: 1,
      }),
    ).rejects.toThrow('მოთხოვნა არასწორია')
    const record = await detail(id)
    expect(record.longitude).toBe(fields.longitude)
    expect(record.latitude).toBe(fields.latitude)
    expect(record.version).toBe(1)
    expect(record.history).toHaveLength(1)
    expect((await service.listCompanyJobs(worker, search)).total).toBe(1)
  })
  it('filters, sorts and paginates in SQL with consistent counts and escaped wildcards', async () => {
    for (let index = 0; index < 14; index++)
      await createPin({
        title: `ობიექტი ${String(index).padStart(2, '0')}`,
        kind: index % 2 ? 'measurement' : 'installation',
      })
    const first = await service.listCompanyJobs(worker, {
      ...search,
      view: 'list',
      sort: 'title',
    })
    const second = await service.listCompanyJobs(worker, {
      ...search,
      view: 'list',
      sort: 'title',
      page: 2,
    })
    expect(first.total).toBe(14)
    expect(first.items).toHaveLength(12)
    expect(second.items).toHaveLength(2)
    const map = await service.listCompanyJobs(worker, {
      ...search,
      view: 'map',
      page: 2,
    })
    expect(map.items).toHaveLength(14)
    expect(map.markers).toHaveLength(14)
    expect(
      first.items
        .map((item) => item.id)
        .some((id) => second.items.some((item) => item.id === id)),
    ).toBe(false)
    expect(
      (
        await service.listCompanyJobs(worker, {
          ...search,
          kind: 'measurement',
        })
      ).total,
    ).toBe(7)
    expect(
      (await service.listCompanyJobs(worker, { ...search, q: '%' })).total,
    ).toBe(0)
    await transition(first.items[0].id, 'en_route')
    expect(
      (await service.listCompanyJobs(worker, { ...search, scope: 'mine' }))
        .total,
    ).toBe(1)
    expect(
      (await service.listCompanyJobs(other, { ...search, scope: 'mine' }))
        .total,
    ).toBe(0)
    expect(
      (await service.listCompanyJobs(worker, { ...search, status: 'en_route' }))
        .total,
    ).toBe(1)
    expect(
      (await service.listCompanyJobs(worker, { ...search, q: 'ინსტრუქცია' }))
        .total,
    ).toBe(14)
  })
  it('filters creation dates with inclusive Tbilisi calendar days across items, markers and totals', async () => {
    const points = []
    for (const [timestamp, located] of [
      ['2026-10-31T19:59:59.999Z', true],
      ['2026-10-31T20:00:00Z', false],
      ['2026-11-30T19:59:59.999Z', true],
      ['2026-11-30T20:00:00Z', true],
    ] as const) {
      const saved = await createPin(
        located ? {} : { longitude: null, latitude: null },
      )
      await sql().query(
        'UPDATE job SET created_at = $2::timestamptz WHERE id = $1',
        [saved.id, timestamp],
      )
      points.push(saved.id)
    }
    const november = await service.listCompanyJobs(worker, {
      ...search,
      from: '2026-11-01',
      to: '2026-11-30',
    })
    expect(november.items.map((item) => item.id).sort()).toEqual(
      [points[1], points[2]].sort(),
    )
    expect(november.markers.map((item) => item.id)).toEqual([points[2]])
    expect(november).toMatchObject({
      total: 2,
      unmappedTotal: 1,
      mapTruncated: false,
    })
    expect(
      (
        await service.listCompanyJobs(worker, {
          ...search,
          from: '2026-11-01',
          to: '2026-11-01',
        })
      ).items.map((item) => item.id),
    ).toEqual([points[1]])
    expect(
      (
        await service.listCompanyJobs(worker, {
          ...search,
          from: '2026-10-01',
          to: '2026-10-31',
        })
      ).total,
    ).toBe(1)
    await expect(
      service.listCompanyJobs(worker, {
        ...search,
        from: '2026-02-30',
        to: '2026-03-01',
      }),
    ).rejects.toThrow('მოთხოვნა არასწორია')
  })
  it('stores, filters and completes generic jobs with or without a map position', async () => {
    const { id } = await createPin({ kind: 'other', title: 'სხვა სამუშაო' })
    const withoutPosition = await createPin({
      kind: 'other',
      title: 'ზოგადი სამუშაო',
      longitude: null,
      latitude: null,
    })
    await createPin()
    const result = await service.listCompanyJobs(worker, {
      ...search,
      kind: 'other',
    })
    expect(result).toMatchObject({ total: 2, unmappedTotal: 1 })
    expect(result.items.every((item) => item.kind === 'other')).toBe(true)
    expect(result.markers.map((item) => item.id)).toEqual([id])
    expect(await detail(withoutPosition.id)).toMatchObject({
      kind: 'other',
      longitude: null,
      latitude: null,
    })
    await transition(id, 'en_route', production)
    await transition(id, 'on_site', production)
    await transition(id, 'completed', production)
    expect(await detail(id)).toMatchObject({
      kind: 'other',
      status: 'completed',
    })
  })
  it('rolls back the job mutation if recording its history fails', async () => {
    const { id } = await createPin()
    await sql().query(
      "CREATE FUNCTION fail_job_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END $$; CREATE TRIGGER fail_job_event BEFORE INSERT ON job_event FOR EACH ROW EXECUTE FUNCTION fail_job_event();",
    )
    try {
      await expect(transition(id, 'en_route')).rejects.toThrow()
      await expect(
        service.editCompanyJob(manager, {
          ...fields,
          id,
          version: 1,
          title: 'არ უნდა შეინახოს',
        }),
      ).rejects.toThrow()
    } finally {
      await sql().query(
        'DROP TRIGGER fail_job_event ON job_event; DROP FUNCTION fail_job_event();',
      )
    }
    const record = await detail(id)
    expect(record.status).toBe('pending')
    expect(record.title).toBe(fields.title)
    expect(record.version).toBe(1)
    expect(record.assigneeId).toBeNull()
    expect(record.history).toHaveLength(1)
  })
  it('enforces database coordinate and assignment constraints', async () => {
    const { id } = await createPin()
    await expect(
      sql().query('UPDATE job SET latitude = 100 WHERE id = $1', [id]),
    ).rejects.toThrow()
    await expect(
      sql().query("UPDATE job SET status = 'completed' WHERE id = $1", [id]),
    ).rejects.toThrow()
    await transition(id, 'en_route', platformAdmin)
    await transition(id, 'rejected', platformAdmin, 'ობიექტი დაკეტილია')
    expect((await detail(id)).status).toBe('rejected')
  })
  it('persists both street names, searches either language, caches lookups and clears stale names on relocation failure', async () => {
    const { suggestCompanyJobAddress } =
      await import('./job-locations.service.server')
    geocoder.enabled = true
    await expect(suggestCompanyJobAddress(production, fields)).rejects.toThrow(
      'წვდომა',
    )
    expect(geocoder.request).not.toHaveBeenCalled()
    geocoder.request.mockImplementation(
      (
        _base: string,
        _request: unknown,
        language: string,
      ): Promise<Array<LocationFeature>> =>
        Promise.resolve([
          {
            sourceId: 'W:123',
            longitude: fields.longitude,
            latitude: fields.latitude,
            name:
              language === 'en' ? 'University Street' : 'უნივერსიტეტის ქუჩა',
            street: '',
            city: language === 'en' ? 'Tbilisi' : 'თბილისი',
            houseNumber: '',
            countryCode: 'GE',
            isStreet: true,
          },
        ]),
    )
    expect(await suggestCompanyJobAddress(manager, fields)).toBe(
      'უნივერსიტეტის ქუჩა, თბილისი',
    )
    const first = await createPin()
    await createPin()
    expect(geocoder.request).toHaveBeenCalledTimes(2)
    const saved = await detail(first.id)
    expect(saved.streetNameKa).toBe('უნივერსიტეტის ქუჩა')
    expect(saved.streetNameEn).toBe('University Street')
    expect(saved.locationResolvedAt).toEqual(expect.any(String))
    for (const q of ['უნივერსიტეტის', 'University Street'])
      expect(
        (await service.listCompanyJobs(worker, { ...search, q })).total,
      ).toBe(2)
    geocoder.request.mockRejectedValue(new Error('Provider unavailable'))
    await service.editCompanyJob(manager, {
      ...fields,
      id: first.id,
      version: 1,
      longitude: 44.81,
      address: 'ხელით მითითებული მისამართი',
    })
    const moved = await detail(first.id)
    expect(moved.streetNameKa).toBeNull()
    expect(moved.streetNameEn).toBeNull()
    expect(moved.locationResolvedAt).toBeNull()
    expect(moved.address).toBe('ხელით მითითებული მისამართი')
  })
  it('reserves provider requests globally and bounds the queue', async () => {
    const repository = await import('./job-locations.repository.server')
    const waits = await Promise.all(
      Array.from({ length: 3 }, () =>
        repository.reserveLocationRequest('test-provider'),
      ),
    )
    const ordered = waits.filter((wait) => wait !== null).sort((a, b) => a - b)
    expect(ordered).toHaveLength(3)
    expect(ordered[0]).toBeLessThan(100)
    expect(ordered[1]).toBeGreaterThan(900)
    expect(ordered[2]).toBeGreaterThan(1900)
    await sql().query(
      "UPDATE job_geocoding_gate SET next_request_at = clock_timestamp() + interval '1 minute' WHERE provider = 'test-provider'",
    )
    expect(await repository.reserveLocationRequest('test-provider')).toBeNull()
  })
  it('notifies only the currently permitted creator and affected assignee, including prior assignee on reopen', async () => {
    await sql().query('DELETE FROM notification')
    const { id } = await createPin()
    expect(
      (await sql().query('SELECT id FROM notification')).rows,
    ).toHaveLength(0)
    await transition(id, 'en_route')
    expect(
      (await sql().query('SELECT recipient_id FROM notification')).rows,
    ).toEqual([{ recipient_id: manager.id }])
    await transition(id, 'on_site', manager)
    expect(
      (await sql().query('SELECT recipient_id FROM notification')).rows.map(
        (row) => row.recipient_id,
      ),
    ).toEqual([manager.id, worker.id])
    await transition(id, 'pending', manager, 'ხელახლა დაგეგმვა')
    const notices = (
      await sql().query('SELECT recipient_id, title FROM notification')
    ).rows
    expect(notices.at(-1)).toEqual({
      recipient_id: worker.id,
      title: 'სამუშაო თავიდან დაიგეგმა',
    })
    await sql().query(
      `UPDATE "user" SET permission_overrides='{"allow":[],"deny":["jobs.manage"]}' WHERE id=$1`,
      [manager.id],
    )
    try {
      await transition(id, 'en_route')
      expect(
        (await sql().query('SELECT id FROM notification')).rows,
      ).toHaveLength(3)
    } finally {
      await sql().query(
        `UPDATE "user" SET permission_overrides='{"allow":[],"deny":[]}' WHERE id=$1`,
        [manager.id],
      )
    }
  })
  it('does not notify unchanged edits and emits one material edit notice without notifying unrelated managers', async () => {
    const { id } = await createPin({ longitude: null, latitude: null })
    await transition(id, 'en_route')
    await sql().query('DELETE FROM notification')
    const edit = {
      ...fields,
      longitude: null,
      latitude: null,
      id,
      version: (await detail(id)).version,
    }
    await service.editCompanyJob(manager, edit)
    expect(
      (await sql().query('SELECT id FROM notification')).rows,
    ).toHaveLength(0)
    await service.editCompanyJob(manager, {
      ...edit,
      version: (await detail(id)).version,
      notes: 'შეცვლილი ინსტრუქცია',
    })
    expect(
      (await sql().query('SELECT recipient_id, destination FROM notification'))
        .rows,
    ).toEqual([
      { recipient_id: worker.id, destination: { kind: 'job', jobId: id } },
    ])
    await expect(
      service.editCompanyJob(manager, { ...edit, notes: 'სხვა' }),
    ).rejects.toThrow()
    expect(
      (await sql().query('SELECT id FROM notification')).rows,
    ).toHaveLength(1)
  })
  it('rolls back a job claim and its history if notification delivery fails', async () => {
    const { id } = await createPin()
    await sql().query(
      `CREATE FUNCTION fail_job_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test notification failure'; END $$; CREATE TRIGGER fail_job_notification BEFORE INSERT ON notification FOR EACH ROW EXECUTE FUNCTION fail_job_notification()`,
    )
    try {
      await expect(transition(id, 'en_route')).rejects.toThrow()
    } finally {
      await sql().query(
        'DROP TRIGGER fail_job_notification ON notification; DROP FUNCTION fail_job_notification()',
      )
    }
    const record = await detail(id)
    expect(record.status).toBe('pending')
    expect(record.history).toHaveLength(1)
  })

  it('accepts a full-length rejection reason and stores a bounded safe notification preview', async () => {
    const { id } = await createPin()
    await transition(id, 'en_route')
    await sql().query('DELETE FROM notification')
    await transition(id, 'rejected', worker, 'ა'.repeat(2000))
    const notice = (
      await sql().query('SELECT recipient_id, body FROM notification')
    ).rows[0]
    expect(notice.recipient_id).toBe(manager.id)
    expect(notice.body.length).toBe(2000)
    expect((await detail(id)).status).toBe('rejected')
  })
})
