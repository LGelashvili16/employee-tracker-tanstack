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
import type { Actor } from '#/lib/authorization/actor'
import type * as Service from './attendance.service.server'
import type * as Scheduling from '#/features/scheduling/server/scheduling.service.server'
import type * as Review from './attendance-review.service.server'
import type { db as Database } from '#/db'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const enabled = process.env.RUN_ATTENDANCE_DB_TESTS === '1'
const originalUrl = process.env.DATABASE_URL
const databaseName = `teamwork_attendance_test_${randomBytes(8).toString('hex')}`
let admin: pg.Client | undefined
let connection: pg.Client | undefined
let database: typeof Database | undefined
let service: typeof Service
let scheduling: typeof Scheduling
let review: typeof Review
let created = false
let employeeId: string
const actor: Actor = {
  id: 'attendance-a',
  name: 'ანა',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
const other: Actor = { ...actor, id: 'attendance-b' }
const request = (last: string | null = null) => ({
  requestId: randomUUID(),
  expectedLastSessionId: last,
})
function sql() {
  if (!connection) throw new Error('Isolated database is unavailable')
  return connection
}
function time(instant: string) {
  vi.setSystemTime(new Date(instant))
}

describe.runIf(enabled)('attendance workflow against PostgreSQL', () => {
  beforeAll(async () => {
    if (!originalUrl)
      throw new Error('Local PostgreSQL configuration is required')
    const target = new URL(originalUrl)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
      throw new Error('Attendance tests require local PostgreSQL')
    admin = new pg.Client({
      connectionString: originalUrl,
      connectionTimeoutMillis: 3000,
    })
    await admin.connect()
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    created = true
    target.pathname = `/${databaseName}`
    connection = new pg.Client({ connectionString: target.toString() })
    await connection.connect()
    for (const file of readdirSync('drizzle')
      .filter((value) => /^\d+.*\.sql$/.test(value))
      .sort())
      await connection.query(
        readFileSync(`drizzle/${file}`, 'utf8').replaceAll(
          '--> statement-breakpoint',
          '',
        ),
      )
    process.env.DATABASE_URL = target.toString()
    service = await import('./attendance.service.server')
    review = await import('./attendance-review.service.server')
    scheduling =
      await import('#/features/scheduling/server/scheduling.service.server')
    database = (await import('#/db')).db
    await sql().query(
      `INSERT INTO "user" (id, name, email, roles) VALUES ('attendance-a', 'ანა', 'a@attendance.invalid', 'employee'), ('attendance-b', 'ბექა', 'b@attendance.invalid', 'employee'), ('review-manager', 'ხელმძღვანელი', 'manager@attendance.invalid', 'supervisor'), ('review-admin', 'ადმინისტრატორი', 'admin@attendance.invalid', 'admin')`,
    )
    const employees = await sql().query(
      `INSERT INTO employee (code, user_id, full_name) VALUES ('attendance-a', 'attendance-a', 'ანა'), ('attendance-b', 'attendance-b', 'ბექა'), ('review-manager', 'review-manager', 'ხელმძღვანელი'), ('review-admin', 'review-admin', 'ადმინისტრატორი') RETURNING id, user_id`,
    )
    employeeId = employees.rows.find(
      (row: { user_id: string }) => row.user_id === actor.id,
    ).id
  }, 30_000)
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    time('2026-11-04T06:05:00Z')
    await sql().query(
      'DELETE FROM attendance_audit; DELETE FROM attendance_reviewer; DELETE FROM attendance_setting; DELETE FROM attendance_session; DELETE FROM company_schedule_day; DELETE FROM company_schedule;',
    )
    await sql().query(
      `UPDATE "user" SET access_state = 'active'; UPDATE employee SET status = 'active';`,
    )
    await sql().query(
      `INSERT INTO company_schedule (effective_from, timezone, late_grace_minutes, early_departure_grace_minutes) VALUES ('2026-01-01', 'Asia/Tbilisi', 0, 0)`,
    )
    await sql().query(
      `INSERT INTO company_schedule_day SELECT '2026-01-01', day, CASE WHEN day = 7 THEN NULL ELSE time '10:00' END, CASE WHEN day = 7 THEN NULL ELSE time '19:00' END FROM generate_series(1,7) AS day`,
    )
  })
  afterAll(async () => {
    vi.useRealTimers()
    await database?.$client.end()
    await connection?.end()
    process.env.DATABASE_URL = originalUrl
    if (admin) {
      if (created)
        await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`)
      await admin.end()
    }
  })

  it('requires an authenticated, linked, active employee on direct reads and writes', async () => {
    for (const denied of [null, { ...actor, id: 'missing-account' }]) {
      await expect(service.getAttendanceOverview(denied)).rejects.toThrow()
      await expect(service.checkIn(denied, request())).rejects.toThrow()
    }
    await sql().query(
      `UPDATE employee SET status = 'inactive' WHERE user_id = 'attendance-a'`,
    )
    await expect(service.checkIn(actor, request())).rejects.toThrow()
    await sql().query(
      `UPDATE employee SET status = 'active'; UPDATE "user" SET access_state = 'suspended' WHERE id = 'attendance-a'`,
    )
    await expect(service.checkIn(actor, request())).rejects.toThrow()
    await expect(service.getAttendanceOverview(actor)).rejects.toThrow()
  })
  it('returns an explicit unconfigured state and refuses unscheduled clock-in', async () => {
    await sql().query(
      'DELETE FROM company_schedule_day; DELETE FROM company_schedule;',
    )
    expect((await service.getAttendanceOverview(actor)).workday.kind).toBe(
      'unconfigured',
    )
    await expect(service.checkIn(actor, request())).rejects.toThrow()
    expect(
      (await sql().query('SELECT * FROM attendance_session')).rows,
    ).toHaveLength(0)
  })
  it('respects explicit nonworking days', async () => {
    time('2026-11-08T06:05:00Z')
    expect((await service.getAttendanceOverview(actor)).workday.kind).toBe(
      'day_off',
    )
    await expect(service.checkIn(actor, request())).rejects.toThrow()
  })
  it('uses server timestamps and UUIDv7, and recovers persisted time on a fresh read', async () => {
    const result = await service.checkIn(actor, {
      ...request(),
      startedAt: '2000-01-01T00:00:00Z',
      employeeId: 'untrusted',
    })
    expect(result.id.split('-')[2].startsWith('7')).toBe(true)
    time('2026-11-04T07:05:00Z')
    const overview = await service.getAttendanceOverview(actor)
    expect(overview.openSession?.startedAt).toBe('2026-11-04T06:05:00.000Z')
    expect(overview.workday.startsAt).toBe('2026-11-04T06:00:00.000Z')
    expect(overview.today?.seconds).toBe(3600)
    expect(overview.today?.lateSeconds).toBe(300)
    expect(overview.week.days).toBe(1)
    const types = await sql().query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = 'attendance_session' AND column_name IN ('started_at', 'ended_at', 'expected_start_at', 'expected_end_at')`,
    )
    expect(
      types.rows.every((row) => row.data_type === 'timestamp with time zone'),
    ).toBe(true)
  })
  it('accepts an idempotent check-in retry only once', async () => {
    const input = request()
    const first = await service.checkIn(actor, input)
    const second = await service.checkIn(actor, input)
    expect(second.id).toBe(first.id)
    expect(
      (await sql().query('SELECT * FROM attendance_session')).rows,
    ).toHaveLength(1)
  })
  it('serializes competing check-ins and also enforces one open interval at the database', async () => {
    const results = await Promise.allSettled([
      service.checkIn(actor, request()),
      service.checkIn(actor, request()),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    await expect(
      sql().query(
        `INSERT INTO attendance_session (employee_id, request_id, work_date, timezone, schedule_effective_from, expected_start_at, expected_end_at, started_at) SELECT employee_id, $1, work_date, timezone, schedule_effective_from, expected_start_at, expected_end_at, started_at FROM attendance_session LIMIT 1`,
        [randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23505' })
  })
  it('blocks out-of-scope check-out and scopes all history and counts to the actor', async () => {
    const record = await service.checkIn(actor, request())
    await expect(
      service.checkOut(other, { sessionId: record.id, confirmEarly: true }),
    ).rejects.toThrow()
    const overview = await service.getAttendanceOverview(other)
    expect(overview.recent).toEqual([])
    expect(overview.week.seconds).toBe(0)
    expect(overview.openSession).toBeNull()
  })
  it('requires early-out confirmation, then preserves exact early and late differences', async () => {
    const record = await service.checkIn(actor, request())
    time('2026-11-04T09:00:00Z')
    await expect(
      service.checkOut(actor, { sessionId: record.id, confirmEarly: false }),
    ).rejects.toThrow()
    expect(
      (await service.getAttendanceOverview(actor)).openSession,
    ).not.toBeNull()
    await service.checkOut(actor, { sessionId: record.id, confirmEarly: true })
    const overview = await service.getAttendanceOverview(actor)
    expect(overview.today?.seconds).toBe(10500)
    expect(overview.today?.earlySeconds).toBe(21600)
    expect(overview.today?.lateSeconds).toBe(300)
    expect(overview.openSession).toBeNull()
  })
  it('prevents a duplicate checkout and stale check-in after the original interval closes', async () => {
    const record = await service.checkIn(actor, request())
    time('2026-11-04T15:00:00Z')
    await service.checkOut(actor, { sessionId: record.id, confirmEarly: false })
    await expect(
      service.checkOut(actor, { sessionId: record.id, confirmEarly: false }),
    ).rejects.toThrow()
    await expect(service.checkIn(actor, request())).rejects.toThrow()
  })
  it('sums multiple intervals without counting the gap or treating re-entry as first-arrival lateness', async () => {
    const first = await service.checkIn(actor, request())
    time('2026-11-04T09:00:00Z')
    await service.checkOut(actor, { sessionId: first.id, confirmEarly: true })
    time('2026-11-04T10:00:00Z')
    const next = await service.checkIn(actor, request(first.id))
    time('2026-11-04T15:00:00Z')
    await service.checkOut(actor, { sessionId: next.id, confirmEarly: false })
    const overview = await service.getAttendanceOverview(actor)
    expect(overview.today?.seconds).toBe(28500)
    expect(overview.today?.lateSeconds).toBe(300)
    expect(overview.today?.earlySeconds).toBe(0)
    expect(overview.recent).toHaveLength(1)
  })
  it('keeps an unresolved previous-day session open and refuses a second check-in', async () => {
    await service.checkIn(actor, request())
    time('2026-11-05T07:00:00Z')
    const overview = await service.getAttendanceOverview(actor)
    expect(overview.today).toBeNull()
    expect(overview.openSession?.workDate).toBe('2026-11-04')
    expect(overview.recent[0].incomplete).toBe(true)
    await expect(
      service.checkIn(actor, request(overview.lastSessionId)),
    ).rejects.toThrow()
  })
  it('preserves expected instants even if schedule storage changes', async () => {
    await service.checkIn(actor, request())
    await sql().query(
      `UPDATE company_schedule_day SET end_time = '20:00' WHERE start_time is not null`,
    )
    const overview = await service.getAttendanceOverview(actor)
    expect(overview.openSession?.expectedEndAt).toBe('2026-11-04T15:00:00.000Z')
    expect(overview.workday.end).toBe('20:00')
  })
  it('rejects nonexistent DST wall-clock hours and resolves repeated hours to standard time', async () => {
    await sql().query(
      `UPDATE company_schedule SET timezone = 'America/New_York'; UPDATE company_schedule_day SET start_time = '02:30', end_time = '09:00' WHERE weekday = 7`,
    )
    expect(
      (await scheduling.getCompanyWorkday(new Date('2026-03-08T12:00:00Z')))
        .kind,
    ).toBe('unconfigured')
    await sql().query(
      `UPDATE company_schedule_day SET start_time = '01:30' WHERE weekday = 7`,
    )
    expect(
      (await scheduling.getCompanyWorkday(new Date('2026-11-01T12:00:00Z')))
        .startsAt,
    ).toBe('2026-11-01T06:30:00.000Z')
  })
  it('validates mutation inputs before writes and retains attendance on employee deletion', async () => {
    await expect(
      service.checkIn(actor, { requestId: 'invalid' }),
    ).rejects.toThrow()
    await service.checkIn(actor, request())
    await expect(
      sql().query('DELETE FROM employee WHERE id = $1', [employeeId]),
    ).rejects.toMatchObject({ code: '23001' })
  })
  it('allows only one of two concurrent check-outs to change the session', async () => {
    const record = await service.checkIn(actor, request())
    time('2026-11-04T15:00:00Z')
    const input = { sessionId: record.id, confirmEarly: false }
    const results = await Promise.allSettled([
      service.checkOut(actor, input),
      service.checkOut(actor, input),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect((await service.getAttendanceOverview(actor)).openSession).toBeNull()
  })
  it('rejects a new interval if the server clock moved behind the last checkout', async () => {
    const record = await service.checkIn(actor, request())
    time('2026-11-04T15:00:00Z')
    await service.checkOut(actor, { sessionId: record.id, confirmEarly: false })
    time('2026-11-04T14:00:00Z')
    await expect(service.checkIn(actor, request(record.id))).rejects.toThrow()
  })
  it('waits for a concurrent schedule write before resolving company-local date and hours', async () => {
    time('2026-11-04T22:30:00Z')
    await sql().query('BEGIN')
    await sql().query('SELECT pg_advisory_xact_lock(812734, 1)')
    const reading = service.getAttendanceOverview(actor)
    let committed = false
    try {
      let waiting = false
      for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
        const locks = await sql().query(
          `SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND classid = 812734 AND objid = 1 AND mode = 'ShareLock' AND NOT granted AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`,
        )
        waiting = locks.rows.length > 0
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10))
      }
      expect(waiting).toBe(true)
      await sql().query(`UPDATE company_schedule SET timezone = 'UTC'`)
      await sql().query('COMMIT')
      committed = true
      const overview = await reading
      expect(overview.workday.timezone).toBe('UTC')
      expect(overview.workday.date).toBe('2026-11-04')
      expect(overview.workday.startsAt).toBe('2026-11-04T10:00:00.000Z')
    } finally {
      if (!committed) await sql().query('ROLLBACK')
      await reading.catch(() => undefined)
    }
  })

  const manager: Actor = {
    ...actor,
    id: 'review-manager',
    roles: ['supervisor'],
  }
  const administrator: Actor = {
    ...actor,
    id: 'review-admin',
    roles: ['admin'],
  }
  async function assign() {
    await review.assignAttendanceReviewer(administrator, {
      employeeId,
      reviewerId: manager.id,
      revoke: false,
      reason: 'თანამშრომლის უშუალო ხელმძღვანელი',
    })
  }
  it('records early starts and outside-schedule time without deducting a hypothetical break', async () => {
    time('2026-11-04T04:00:00Z')
    const record = await service.checkIn(actor, request())
    time('2026-11-04T16:00:00Z')
    await service.checkOut(actor, { sessionId: record.id, confirmEarly: false })
    const overview = await service.getAttendanceOverview(actor)
    expect(overview.today).toMatchObject({
      seconds: 12 * 3600,
      earlyStartSeconds: 2 * 3600,
      lateSeconds: 0,
      earlySeconds: 0,
      outsideSeconds: 3 * 3600,
      approvedOutsideSeconds: 0,
      pendingReviews: 1,
    })
    await assign()
    await review.reviewAttendance(manager, {
      sessionId: record.id,
      revision: 1,
      decision: 'approve',
      approveOutside: true,
      reason: 'დადასტურდა დამატებით შესრულებული სამუშაო',
    })
    expect(
      (await service.getAttendanceOverview(actor)).today
        ?.approvedOutsideSeconds,
    ).toBe(3 * 3600)
    await expect(
      review.reviewAttendance(manager, {
        sessionId: record.id,
        revision: 1,
        decision: 'approve',
        approveOutside: true,
        reason: 'განმეორებითი დადასტურება',
      }),
    ).rejects.toThrow()
  })
  it('preserves an overnight session on its starting date and permits the next morning early check-in', async () => {
    time('2026-11-04T18:58:00Z')
    const record = await service.checkIn(actor, request())
    time('2026-11-04T20:15:00Z')
    const overnight = await service.getAttendanceOverview(actor)
    expect(overnight.workday.date).toBe('2026-11-05')
    expect(overnight.recent[0]).toMatchObject({
      date: '2026-11-04',
      seconds: 77 * 60,
      requiresReview: false,
    })
    await service.checkOut(actor, { sessionId: record.id, confirmEarly: false })
    time('2026-11-05T04:00:00Z')
    await service.checkIn(actor, request(record.id))
    expect((await service.getAttendanceOverview(actor)).today).toMatchObject({
      date: '2026-11-05',
      earlyStartSeconds: 2 * 3600,
    })
  })
  it('requires explicit scope and fresh permissions, forbids self-review and enforces revocation', async () => {
    const record = await service.checkIn(actor, request())
    time('2026-11-04T15:00:00Z')
    await service.checkOut(actor, { sessionId: record.id, confirmEarly: false })
    const decision = {
      sessionId: record.id,
      revision: 1,
      decision: 'approve',
      approveOutside: false,
      reason: 'შესრულებული დრო გადამოწმებულია',
    }
    await expect(review.reviewAttendance(null, decision)).rejects.toThrow()
    await expect(review.reviewAttendance(manager, decision)).rejects.toThrow()
    await expect(
      review.reviewAttendance({ ...actor, roles: ['owner'] }, decision),
    ).rejects.toThrow()
    expect(
      (await review.listAttendanceForReview(manager, { page: 0 })).items,
    ).toEqual([])
    await assign()
    expect(
      (await review.listAttendanceForReview(manager, { page: 0 })).items.map(
        (item) => item.id,
      ),
    ).toEqual([record.id])
    await sql().query(
      `UPDATE "user" SET roles='employee' WHERE id='review-manager'`,
    )
    await expect(review.reviewAttendance(manager, decision)).rejects.toThrow()
    await sql().query(
      `UPDATE "user" SET roles='supervisor' WHERE id='review-manager'`,
    )
    await review.assignAttendanceReviewer(administrator, {
      employeeId,
      reviewerId: manager.id,
      revoke: true,
      reason: 'ხელმძღვანელის უფლებამოსილება დასრულდა',
    })
    await expect(review.reviewAttendance(manager, decision)).rejects.toThrow()
    await expect(
      review.assignAttendanceReviewer(administrator, {
        employeeId,
        reviewerId: actor.id,
        revoke: false,
        reason: 'საკუთარი ჩანაწერის გადამოწმება',
      }),
    ).rejects.toThrow()
  })
  it('audits corrections, preserves original punches and invalidates previous approval', async () => {
    const record = await service.checkIn(actor, request())
    time('2026-11-04T17:00:00Z')
    await service.checkOut(actor, { sessionId: record.id, confirmEarly: false })
    await assign()
    await review.reviewAttendance(manager, {
      sessionId: record.id,
      revision: 1,
      decision: 'approve',
      approveOutside: true,
      reason: 'თავდაპირველი დრო დადასტურებულია',
    })
    await review.correctAttendance(manager, {
      sessionId: record.id,
      revision: 2,
      start: '2026-11-04T10:00',
      end: '2026-11-04T19:00',
      reason: 'თანამშრომლის რეალური დრო გადამოწმებულია',
    })
    const item = (await review.listAttendanceForReview(manager, { page: 0 }))
      .items[0]
    expect(item).toMatchObject({
      reviewState: 'pending',
      revision: 3,
      approvedOutsideSeconds: 0,
      startedAt: '2026-11-04T06:00:00.000Z',
      endedAt: '2026-11-04T15:00:00.000Z',
      originalStartedAt: '2026-11-04T06:05:00.000Z',
      originalEndedAt: '2026-11-04T17:00:00.000Z',
    })
    expect(
      (
        await sql().query(
          `SELECT action FROM attendance_audit WHERE target_id=$1 ORDER BY created_at,id`,
          [record.id],
        )
      ).rows.map((row) => row.action),
    ).toEqual(['attendance.approved', 'attendance.corrected'])
    await expect(
      review.correctAttendance(manager, {
        sessionId: record.id,
        revision: 3,
        start: '2026-11-04T10:00',
        end: '2026-11-06T19:00',
        reason: 'მომავალი დროის დაუშვებელი ჩაწერა',
      }),
    ).rejects.toThrow()
  })
  it('rejects overlaps and serializes competing corrections and approvals', async () => {
    const first = await service.checkIn(actor, request())
    time('2026-11-04T10:00:00Z')
    await service.checkOut(actor, { sessionId: first.id, confirmEarly: true })
    time('2026-11-04T11:00:00Z')
    const second = await service.checkIn(actor, request(first.id))
    time('2026-11-04T16:00:00Z')
    await service.checkOut(actor, { sessionId: second.id, confirmEarly: false })
    await assign()
    await expect(
      review.correctAttendance(manager, {
        sessionId: first.id,
        revision: 1,
        start: '2026-11-04T10:00',
        end: '2026-11-04T17:00',
        reason: 'გადაფარული დროის შესწორება',
      }),
    ).rejects.toThrow()
    const outcomes = await Promise.allSettled([
      review.correctAttendance(manager, {
        sessionId: first.id,
        revision: 1,
        start: '2026-11-04T10:00',
        end: '2026-11-04T14:00',
        reason: 'გადამოწმებული დროის შესწორება',
      }),
      review.reviewAttendance(manager, {
        sessionId: first.id,
        revision: 1,
        decision: 'approve',
        approveOutside: false,
        reason: 'გადამოწმებული დროის დადასტურება',
      }),
    ])
    expect(
      outcomes.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
  })
  it('snapshots the configured warning threshold and never automatically checks out', async () => {
    const first = await service.checkIn(actor, request())
    await review.saveAttendanceLimit(administrator, {
      maxOpenHours: 8,
      revision: 0,
      reason: 'ხანგრძლივი სამუშაოს გადამოწმების წესი',
    })
    time('2026-11-04T20:00:00Z')
    expect(
      (await service.getAttendanceOverview(actor)).openSession?.maxOpenHours,
    ).toBe(16)
    await service.checkOut(actor, { sessionId: first.id, confirmEarly: false })
    time('2026-11-05T04:00:00Z')
    await service.checkIn(actor, request(first.id))
    time('2026-11-05T12:00:00Z')
    const overview = await service.getAttendanceOverview(actor)
    expect(overview.openSession).not.toBeNull()
    expect(overview.openSession?.maxOpenHours).toBe(8)
    expect(overview.today?.requiresReview).toBe(true)
  })
  it('denies direct self-review even if an invalid self-assignment exists in storage', async () => {
    const record = await service.checkIn(manager, request())
    time('2026-11-04T15:00:00Z')
    await service.checkOut(manager, {
      sessionId: record.id,
      confirmEarly: false,
    })
    await sql().query(
      `INSERT INTO attendance_reviewer (reviewer_id,employee_id) SELECT 'review-manager',id FROM employee WHERE user_id='review-manager'`,
    )
    await expect(
      review.reviewAttendance(manager, {
        sessionId: record.id,
        revision: 1,
        decision: 'approve',
        approveOutside: false,
        reason: 'საკუთარი დროის დადასტურება',
      }),
    ).rejects.toThrow()
    expect(
      (await review.listAttendanceForReview(manager, { page: 0 })).items,
    ).toEqual([])
    await expect(
      review.attendanceReviewHistory(manager, { sessionId: record.id }),
    ).rejects.toThrow()
  })
  it('rolls back approval if its audit cannot be persisted', async () => {
    const record = await service.checkIn(actor, request())
    time('2026-11-04T15:00:00Z')
    await service.checkOut(actor, { sessionId: record.id, confirmEarly: false })
    await assign()
    await sql().query(
      `CREATE FUNCTION reject_attendance_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'attendance.approved' THEN RAISE EXCEPTION 'Test audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_attendance_audit BEFORE INSERT ON attendance_audit FOR EACH ROW EXECUTE FUNCTION reject_attendance_audit();`,
    )
    try {
      await expect(
        review.reviewAttendance(manager, {
          sessionId: record.id,
          revision: 1,
          decision: 'approve',
          approveOutside: true,
          reason: 'რეალური დროის დადასტურება',
        }),
      ).rejects.toThrow()
      expect(
        (await review.listAttendanceForReview(manager, { page: 0 })).items[0],
      ).toMatchObject({
        reviewState: 'pending',
        revision: 1,
        approvedOutsideSeconds: 0,
      })
    } finally {
      await sql().query(
        'DROP TRIGGER reject_attendance_audit ON attendance_audit; DROP FUNCTION reject_attendance_audit();',
      )
    }
  })
})
