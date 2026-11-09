import type * as AllowanceService from './day-off-allowance.service.server'
// @vitest-environment node
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
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
import type * as Service from './leave.service.server'
import type { db as Database } from '#/db'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const enabled = process.env.RUN_LEAVE_DB_TESTS === '1'
const originalUrl = process.env.DATABASE_URL
const databaseName = `teamwork_leave_test_${randomBytes(8).toString('hex')}`
let admin: pg.Client | undefined
let connection: pg.Client | undefined
let database: typeof Database | undefined
let allowance: typeof AllowanceService
let service: typeof Service
let created = false
const actor: Actor = {
  id: 'vacation-employee',
  name: 'ანა',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
const hr: Actor = { ...actor, id: 'vacation-hr', roles: ['hr_manager'] }
const administrator: Actor = {
  ...actor,
  id: 'vacation-admin',
  roles: ['admin'],
}
const input = {
  kind: 'day_off',
  startDate: '2026-11-09',
  endDate: '2026-11-09',
  note: 'პირადი საქმე',
}
const decision = (id: string, action = 'approved') => ({
  id,
  action,
  revision: 0,
  startDate: input.startDate,
  endDate: input.endDate,
  reason: 'განხილვის მიზეზი',
})
function sql() {
  if (!connection) throw new Error('Isolated database is unavailable')
  return connection
}

describe.runIf(enabled)('vacation workflow against isolated PostgreSQL', () => {
  beforeAll(async () => {
    if (!originalUrl)
      throw new Error('Local PostgreSQL configuration is required')
    const target = new URL(originalUrl)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
      throw new Error('Vacation tests require local PostgreSQL')
    admin = new pg.Client({
      connectionString: originalUrl,
      connectionTimeoutMillis: 3000,
    })
    await admin.connect()
    const version = await admin.query('show server_version_num')
    expect(Number(version.rows[0].server_version_num)).toBeGreaterThanOrEqual(
      180000,
    )
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    created = true
    target.pathname = `/${databaseName}`
    connection = new pg.Client({ connectionString: target.toString() })
    await connection.connect()
    for (const file of readdirSync('drizzle')
      .filter((value) => /^\d+.*\.sql$/.test(value))
      .sort()) {
      if (file === '0023_vacation_terminology.sql') {
        await connection.query(
          `INSERT INTO "user" (id, name, email, permission_overrides) VALUES ('vacation-migration-check', 'Migration fixture', 'migration@vacation.invalid', '{"allow":["leave.review","jobs.claim"],"deny":["leave.configure"]}')`,
        )
        await connection.query(
          `INSERT INTO leave_request (requester_id, kind, start_date, end_date, note) VALUES ('vacation-migration-check', 'day_off', '2026-11-09', '2026-11-09', 'Retained request')`,
        )
        await connection.query(
          `INSERT INTO leave_audit (request_id, actor_id, action, reason, "after") SELECT id, requester_id, 'created', 'Migration fixture', '{}' FROM leave_request WHERE requester_id='vacation-migration-check'`,
        )
        await connection.query(
          `INSERT INTO day_off_balance (user_id, annual_days, remaining_days, period_year) VALUES ('vacation-migration-check', 4, 2, 2026)`,
        )
      }
      if (file === '0024_paid_vacation_allowances.sql') {
        await connection.query(
          `INSERT INTO "user" (id, name, email) VALUES ('vacation-migration-reviewer', 'Migration reviewer', 'reviewer@migration.invalid')`,
        )
        await connection.query(
          `INSERT INTO vacation_request (requester_id, kind, start_date, end_date, status, reviewer_id, reviewed_at) VALUES ('vacation-migration-check', 'vacation', '2026-11-20', '2026-11-24', 'approved', 'vacation-migration-reviewer', now())`,
        )
      }
      await connection.query(
        readFileSync(`drizzle/${file}`, 'utf8').replaceAll(
          '--> statement-breakpoint',
          '',
        ),
      )
    }
    expect(
      (
        await connection.query(
          `SELECT permission_overrides FROM "user" WHERE id='vacation-migration-check'`,
        )
      ).rows[0].permission_overrides,
    ).toEqual({
      allow: ['leave.review', 'jobs.claim'],
      deny: ['leave.configure'],
    })
    expect(
      (
        await connection.query(
          `SELECT r.note, a.action, b.remaining_days FROM leave_request r JOIN leave_audit a ON a.request_id=r.id JOIN day_off_balance b ON b.user_id=r.requester_id WHERE r.requester_id='vacation-migration-check' AND r.kind='day_off'`,
        )
      ).rows,
    ).toEqual([
      { note: 'Retained request', action: 'created', remaining_days: 2 },
    ])
    expect(
      (
        await connection.query(
          `SELECT charged_vacation_days FROM leave_request WHERE requester_id='vacation-migration-check' AND kind='vacation'`,
        )
      ).rows[0].charged_vacation_days,
    ).toBe(2)
    expect(
      (
        await connection.query(
          `SELECT vacation_remaining_days FROM day_off_balance WHERE user_id='vacation-migration-check'`,
        )
      ).rows[0].vacation_remaining_days,
    ).toBe(22)
    await connection.query(
      `DELETE FROM day_off_allowance_audit WHERE target_user_id='vacation-migration-check'; DELETE FROM leave_audit WHERE actor_id='vacation-migration-check'; DELETE FROM leave_request WHERE requester_id='vacation-migration-check'; DELETE FROM day_off_balance WHERE user_id='vacation-migration-check'; DELETE FROM "user" WHERE id IN ('vacation-migration-check', 'vacation-migration-reviewer');`,
    )
    process.env.DATABASE_URL = target.toString()
    service = await import('./leave.service.server')
    allowance = await import('./day-off-allowance.service.server')
    database = (await import('#/db')).db
    await sql().query(
      `INSERT INTO "user" (id, name, email, roles) VALUES ('vacation-employee', 'ანა', 'a@vacation.invalid', 'employee'), ('vacation-other', 'ბექა', 'b@vacation.invalid', 'production_specialist'), ('vacation-hr', 'პერსონალი', 'hr@vacation.invalid', 'hr_manager'), ('vacation-admin', 'ადმინისტრატორი', 'admin@vacation.invalid', 'admin'), ('vacation-supervisor', 'ხელმძღვანელი', 'supervisor@vacation.invalid', 'supervisor')`,
    )
    await sql().query(
      `INSERT INTO employee (username, user_id, full_name) SELECT id, id, name FROM "user"`,
    )
  }, 30000)
  beforeEach(async () => {
    vi.useRealTimers()
    await sql()
      .query(`DELETE FROM employee_work_schedule; DELETE FROM company_schedule_audit; DELETE FROM company_schedule_day; DELETE FROM company_schedule;
      INSERT INTO company_schedule (effective_from, timezone, late_grace_minutes, early_departure_grace_minutes) VALUES ('2020-01-01', 'Asia/Tbilisi', 0, 0);
      INSERT INTO company_schedule_day (effective_from, weekday, start_time, end_time) SELECT '2020-01-01', day, CASE WHEN day <= 5 THEN '10:00'::time ELSE null END, CASE WHEN day <= 5 THEN '19:00'::time ELSE null END FROM generate_series(1,7) day;`)

    await sql().query(
      `DELETE FROM day_off_allowance_audit; DELETE FROM day_off_balance; UPDATE day_off_setting SET default_days=4, default_vacation_days=24, reset_yearly=true, revision=0; DELETE FROM leave_audit; DELETE FROM leave_request; UPDATE "user" SET access_state = 'active', permission_overrides = '{"allow":[],"deny":[]}'; UPDATE employee SET status = 'active';`,
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
  it('opens and approves sick leave without charging either allowance, then records the last sick day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-12T08:00:00Z'))
    const request = await service.createLeave(actor, {
      ...input,
      kind: 'sick_leave',
      endDate: null,
      note: '',
    })
    await service.reviewLeave(hr, { ...decision(request.id), endDate: null })
    expect(
      await database!.transaction((tx) =>
        service.readApprovedLeaveForAttendance(tx, actor.id, '2026-12-01'),
      ),
    ).toBeTruthy()
    expect(await allowance.readOwnDayOffBalance(actor)).toMatchObject({
      remainingDays: 4,
      vacationRemainingDays: 24,
    })
    await service.closeSickLeave(actor, {
      id: request.id,
      revision: 1,
      endDate: '2026-11-11',
    })
    const row = (
      await sql().query(
        'SELECT status, end_date::text, reviewer_id, charged_vacation_days FROM leave_request WHERE id=$1',
        [request.id],
      )
    ).rows[0]
    expect(row).toMatchObject({
      status: 'approved',
      end_date: '2026-11-11',
      reviewer_id: hr.id,
      charged_vacation_days: 0,
    })
    expect(
      await database!.transaction((tx) =>
        service.readApprovedLeaveForAttendance(tx, actor.id, '2026-11-12'),
      ),
    ).toBeNull()
    expect(
      (
        await sql().query(
          'SELECT action FROM leave_audit WHERE request_id=$1 ORDER BY created_at, id',
          [request.id],
        )
      ).rows.map((auditRow) => auditRow.action),
    ).toEqual(['created', 'approved', 'closed'])
    await expect(
      service.closeSickLeave(actor, {
        id: request.id,
        revision: 2,
        endDate: '2026-11-12',
      }),
    ).rejects.toThrow()
  })
  it('allows pending sick-leave closure and HR closure, with ownership, dates, kind and stale revision protected', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-12T08:00:00Z'))
    const request = await service.createLeave(actor, {
      ...input,
      kind: 'sick_leave',
      endDate: null,
    })
    const close = { id: request.id, revision: 0, endDate: '2026-11-11' }
    await expect(
      service.closeSickLeave({ ...actor, id: 'vacation-other' }, close),
    ).rejects.toThrow()
    await expect(service.closeSickLeave(null, close)).rejects.toThrow()
    await expect(
      service.closeSickLeave(actor, { ...close, endDate: '2026-11-13' }),
    ).rejects.toThrow()
    await expect(
      service.closeSickLeave(actor, { ...close, endDate: '2026-11-08' }),
    ).rejects.toThrow()
    await expect(
      service.closeSickLeave(actor, { ...close, revision: 5 }),
    ).rejects.toThrow()
    await service.closeSickLeave(hr, close)
    expect(
      (
        await sql().query('SELECT status FROM leave_request WHERE id=$1', [
          request.id,
        ])
      ).rows[0].status,
    ).toBe('pending')
    await expect(
      service.reviewLeave(hr, { ...decision(request.id), endDate: null }),
    ).rejects.toThrow()
    const ordinary = await service.createLeave(actor, {
      ...input,
      startDate: '2026-11-12',
      endDate: '2026-11-12',
    })
    await expect(
      service.closeSickLeave(actor, {
        id: ordinary.id,
        revision: 0,
        endDate: '2026-11-12',
      }),
    ).rejects.toThrow()
  })
  it('keeps open sick-leave overlap checks and cancellation serialized with closure', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-12T08:00:00Z'))
    const request = await service.createLeave(actor, {
      ...input,
      kind: 'sick_leave',
      endDate: null,
    })
    await expect(
      service.createLeave(actor, {
        ...input,
        startDate: '2027-01-04',
        endDate: '2027-01-04',
      }),
    ).rejects.toThrow()
    const results = await Promise.allSettled([
      service.closeSickLeave(actor, {
        id: request.id,
        revision: 0,
        endDate: '2026-11-11',
      }),
      service.cancelLeave(actor, { id: request.id, revision: 0 }),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    const row = (
      await sql().query('SELECT revision FROM leave_request WHERE id=$1', [
        request.id,
      ])
    ).rows[0]
    expect(row.revision).toBe(1)
  })
  it('charges only paid working days on vacation approval, retaining a stable charge and the separate day-off balance', async () => {
    const request = await service.createLeave(actor, {
      ...input,
      kind: 'vacation',
      startDate: '2026-11-20',
      endDate: '2026-11-24',
    })
    const review = {
      ...decision(request.id),
      startDate: '2026-11-20',
      endDate: '2026-11-24',
    }
    await service.reviewLeave(hr, review)
    expect(await allowance.readOwnDayOffBalance(actor)).toMatchObject({
      remainingDays: 4,
      vacationAnnualDays: 24,
      vacationRemainingDays: 22,
    })
    expect(
      (
        await sql().query(
          'SELECT charged_vacation_days FROM leave_request WHERE id=$1',
          [request.id],
        )
      ).rows[0].charged_vacation_days,
    ).toBe(2)
    await expect(service.reviewLeave(hr, review)).rejects.toThrow()
    expect(
      (await allowance.readOwnDayOffBalance(actor)).vacationRemainingDays,
    ).toBe(22)
  })
  it('adds vacation allowance at company-local January 1 with unused days preserved and no duplicate credit', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-12-31T19:59:00Z'))
    const before = await allowance.readOwnDayOffBalance(actor)
    await allowance.adjustEmployeeDayOffBalance(hr, {
      ...before,
      userId: actor.id,
      vacationAnnualDays: 30,
      vacationRemainingDays: 2,
      reason: 'შვებულების ბალანსის ცვლილება',
    })
    const policy = await allowance.readDayOffSettings(hr)
    await allowance.saveDayOffSettings(hr, {
      ...policy,
      resetYearly: false,
      reason: 'დასვენების განახლების გამორთვა',
    })
    vi.setSystemTime(new Date('2026-12-31T20:01:00Z'))
    expect(
      (await allowance.readOwnDayOffBalance(actor)).vacationRemainingDays,
    ).toBe(32)
    expect(
      (await allowance.readOwnDayOffBalance(actor)).vacationRemainingDays,
    ).toBe(32)
    expect(
      (
        await sql().query(
          'SELECT vacation_remaining_days FROM day_off_balance WHERE user_id=$1',
          [actor.id],
        )
      ).rows[0].vacation_remaining_days,
    ).toBe(2)
    const request = await service.createLeave(actor, {
      ...input,
      kind: 'vacation',
      startDate: '2027-01-04',
      endDate: '2027-01-04',
    })
    await service.reviewLeave(hr, {
      ...decision(request.id),
      startDate: '2027-01-04',
      endDate: '2027-01-04',
    })
    expect(
      (await allowance.readOwnDayOffBalance(actor)).vacationRemainingDays,
    ).toBe(31)
    expect(
      (
        await sql().query(
          "SELECT count(*)::int AS count FROM day_off_allowance_audit WHERE action='vacation_credited'",
        )
      ).rows[0].count,
    ).toBe(1)
    vi.setSystemTime(new Date('2028-01-01T00:00:00Z'))
    expect(
      (await allowance.readOwnDayOffBalance(actor)).vacationRemainingDays,
    ).toBe(61)
  })
  it('serializes competing approvals against the last vacation day and rejects below-minimum annual policies', async () => {
    const balance = await allowance.readOwnDayOffBalance(actor)
    await allowance.adjustEmployeeDayOffBalance(hr, {
      ...balance,
      userId: actor.id,
      vacationRemainingDays: 1,
      reason: 'ბალანსის ცვლილება',
    })
    const a = await service.createLeave(actor, {
      ...input,
      kind: 'vacation',
    })
    const b = await service.createLeave(actor, {
      ...input,
      kind: 'vacation',
      startDate: '2026-11-10',
      endDate: '2026-11-10',
    })
    const results = await Promise.allSettled([
      service.reviewLeave(hr, decision(a.id)),
      service.reviewLeave(administrator, {
        ...decision(b.id),
        startDate: '2026-11-10',
        endDate: '2026-11-10',
      }),
    ])
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    )
    expect(
      (await allowance.readOwnDayOffBalance(actor)).vacationRemainingDays,
    ).toBe(0)
    const policy = await allowance.readDayOffSettings(hr)
    await expect(
      allowance.saveDayOffSettings(hr, {
        ...policy,
        defaultVacationDays: 23,
        reason: 'წესის ცვლილება',
      }),
    ).rejects.toThrow()
    await expect(
      allowance.adjustEmployeeDayOffBalance(hr, {
        ...balance,
        userId: actor.id,
        vacationAnnualDays: 23,
        reason: 'წესის ცვლილება',
      }),
    ).rejects.toThrow()
  })
  it('uses the employee custom week and blocks approval without a configured schedule', async () => {
    const days = Array.from({ length: 7 }, (_, index) => ({
      weekday: index + 1,
      hours: index === 5 ? { start: '10:00', end: '19:00' } : null,
    }))
    await sql().query(
      `INSERT INTO employee_work_schedule (employee_id, days, assigned_by) SELECT id, $1::jsonb, $2 FROM employee WHERE user_id=$3`,
      [JSON.stringify(days), hr.id, actor.id],
    )
    const request = await service.createLeave(actor, {
      ...input,
      kind: 'vacation',
      startDate: '2026-11-09',
      endDate: '2026-11-15',
    })
    await service.reviewLeave(hr, {
      ...decision(request.id),
      endDate: '2026-11-15',
    })
    expect(
      (await allowance.readOwnDayOffBalance(actor)).vacationRemainingDays,
    ).toBe(23)
    await sql().query(
      'DELETE FROM company_schedule_day; DELETE FROM company_schedule;',
    )
    const missing = await service.createLeave(actor, {
      ...input,
      kind: 'vacation',
      startDate: '2026-11-16',
      endDate: '2026-11-16',
    })
    await expect(
      service.reviewLeave(hr, {
        ...decision(missing.id),
        startDate: '2026-11-16',
        endDate: '2026-11-16',
      }),
    ).rejects.toThrow('სამუშაო განრიგი')
    expect(
      (await allowance.readOwnDayOffBalance(actor)).vacationRemainingDays,
    ).toBe(23)
  })
  it('deducts once after approval and rolls back approval when the balance is exhausted', async () => {
    const initial = await allowance.readOwnDayOffBalance(actor)
    expect(initial.remainingDays).toBe(4)
    for (let day = 10; day <= 14; day++) {
      const date = `2026-11-${day}`
      const request = await service.createLeave(actor, {
        ...input,
        startDate: date,
        endDate: date,
      })
      const approve = () =>
        service.reviewLeave(hr, {
          ...decision(request.id),
          startDate: date,
          endDate: date,
        })
      if (day < 14) {
        await approve()
        await expect(approve()).rejects.toThrow()
      } else {
        await expect(approve()).rejects.toThrow('ამოწურულია')
        expect(
          (
            await sql().query('SELECT status FROM leave_request WHERE id=$1', [
              request.id,
            ])
          ).rows[0].status,
        ).toBe('pending')
      }
    }
    expect((await allowance.readOwnDayOffBalance(actor)).remainingDays).toBe(0)
    expect(
      (
        await sql().query(
          "SELECT count(*)::int AS count FROM day_off_allowance_audit WHERE action='consumed'",
        )
      ).rows[0].count,
    ).toBe(4)
  })
  it('allows only one concurrent approval for the last remaining day', async () => {
    const balance = await allowance.readEmployeeDayOffBalance(hr, {
      userId: actor.id,
    })
    await allowance.adjustEmployeeDayOffBalance(hr, {
      ...balance,
      userId: actor.id,
      remainingDays: 1,
      reason: 'ბალანსის ცვლილება',
    })
    const a = await service.createLeave(actor, input)
    const b = await service.createLeave(actor, {
      ...input,
      startDate: '2026-11-10',
      endDate: '2026-11-10',
    })
    const results = await Promise.allSettled([
      service.reviewLeave(hr, decision(a.id)),
      service.reviewLeave(administrator, {
        ...decision(b.id),
        startDate: '2026-11-10',
        endDate: '2026-11-10',
      }),
    ])
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    )
    expect((await allowance.readOwnDayOffBalance(actor)).remainingDays).toBe(0)
  })
  it('does not debit vacations, rejected or cancelled requests', async () => {
    const vacation = await service.createLeave(actor, {
      ...input,
      kind: 'vacation',
    })
    await service.reviewLeave(hr, decision(vacation.id))
    const rejected = await service.createLeave(actor, {
      ...input,
      startDate: '2026-11-10',
      endDate: '2026-11-10',
    })
    await service.reviewLeave(hr, {
      ...decision(rejected.id, 'rejected'),
      startDate: '2026-11-10',
      endDate: '2026-11-10',
    })
    const cancelled = await service.createLeave(actor, {
      ...input,
      startDate: '2026-11-11',
      endDate: '2026-11-11',
    })
    await service.cancelLeave(actor, { id: cancelled.id, revision: 0 })
    expect((await allowance.readOwnDayOffBalance(actor)).remainingDays).toBe(4)
  })
  it('resets by company calendar year without writes on reads, and preserves balance when toggled', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-12-31T19:59:00Z'))
    const initial = await allowance.readOwnDayOffBalance(actor)
    await allowance.adjustEmployeeDayOffBalance(hr, {
      ...initial,
      userId: actor.id,
      annualDays: 6,
      remainingDays: 2,
      reason: 'ბალანსის ცვლილება',
    })
    vi.setSystemTime(new Date('2026-12-31T20:01:00Z'))
    const reset = await allowance.readOwnDayOffBalance(actor)
    expect(reset).toMatchObject({ remainingDays: 6, year: 2027 })
    expect(
      (
        await sql().query(
          'SELECT remaining_days FROM day_off_balance WHERE user_id=$1',
          [actor.id],
        )
      ).rows[0].remaining_days,
    ).toBe(2)
    const policy = await allowance.readDayOffSettings(hr)
    await allowance.saveDayOffSettings(hr, {
      ...policy,
      resetYearly: false,
      reason: 'წლიური განახლების გამორთვა',
    })
    vi.setSystemTime(new Date('2028-01-02T00:00:00Z'))
    expect((await allowance.readOwnDayOffBalance(actor)).remainingDays).toBe(6)
    const balance = await allowance.readOwnDayOffBalance(actor)
    await allowance.adjustEmployeeDayOffBalance(hr, {
      ...balance,
      userId: actor.id,
      remainingDays: 3,
      reason: 'ბალანსის ცვლილება',
    })
    const offPolicy = await allowance.readDayOffSettings(hr)
    await allowance.saveDayOffSettings(hr, {
      ...offPolicy,
      resetYearly: true,
      reason: 'წლიური განახლების ჩართვა',
    })
    expect((await allowance.readOwnDayOffBalance(actor)).remainingDays).toBe(3)
    vi.setSystemTime(new Date('2029-01-02T00:00:00Z'))
    expect((await allowance.readOwnDayOffBalance(actor)).remainingDays).toBe(6)
  })
  it('protects adjustments and policy writes with current permissions, revisions and year', async () => {
    const balance = await allowance.readOwnDayOffBalance(actor)
    const adjustment = {
      ...balance,
      userId: actor.id,
      remainingDays: 5,
      reason: 'ბალანსის ცვლილება',
    }
    await expect(
      allowance.adjustEmployeeDayOffBalance(actor, adjustment),
    ).rejects.toThrow()
    await expect(
      allowance.readEmployeeDayOffBalance(actor, { userId: hr.id }),
    ).rejects.toThrow()
    await expect(
      allowance.adjustEmployeeDayOffBalance(hr, {
        ...adjustment,
        userId: hr.id,
      }),
    ).rejects.toThrow()
    await expect(
      allowance.adjustEmployeeDayOffBalance(hr, {
        ...adjustment,
        remainingDays: -1,
      }),
    ).rejects.toThrow()
    await expect(
      allowance.adjustEmployeeDayOffBalance(hr, {
        ...adjustment,
        year: balance.year - 1,
      }),
    ).rejects.toThrow()
    await allowance.adjustEmployeeDayOffBalance(hr, adjustment)
    await expect(
      allowance.adjustEmployeeDayOffBalance(hr, adjustment),
    ).rejects.toThrow()
    const policy = await allowance.readDayOffSettings(hr)
    await expect(
      allowance.saveDayOffSettings(actor, {
        ...policy,
        reason: 'წესის ცვლილება',
      }),
    ).rejects.toThrow()
    await allowance.saveDayOffSettings(hr, {
      ...policy,
      defaultDays: 7,
      reason: 'წესის ცვლილება',
    })
    await expect(
      allowance.saveDayOffSettings(hr, { ...policy, reason: 'წესის ცვლილება' }),
    ).rejects.toThrow()
    expect((await allowance.readOwnDayOffBalance(actor)).remainingDays).toBe(5)
  })
  it('denies anonymous, missing, suspended, and inactive accounts on direct reads and writes', async () => {
    for (const denied of [null, { ...actor, id: 'missing' }]) {
      await expect(service.createLeave(denied, input)).rejects.toThrow()
      await expect(service.listLeave(denied, {})).rejects.toThrow()
    }
    await sql().query(
      `UPDATE "user" SET access_state = 'suspended' WHERE id = 'vacation-employee'`,
    )
    await expect(service.createLeave(actor, input)).rejects.toThrow()
    await sql().query(
      `UPDATE "user" SET access_state = 'active'; UPDATE employee SET status = 'inactive' WHERE user_id = 'vacation-employee'`,
    )
    await expect(service.listLeave(actor, {})).rejects.toThrow()
  })
  it('allows every employee role to request and scopes personal history by trusted identity', async () => {
    for (const subject of [
      actor,
      hr,
      administrator,
      {
        ...actor,
        id: 'vacation-other',
        roles: ['production_specialist'] as const,
      },
      { ...actor, id: 'vacation-supervisor' },
    ])
      await service.createLeave(
        { ...subject, roles: [...subject.roles] },
        { ...input, requesterId: 'vacation-other' },
      )
    expect((await service.listLeave(actor, {})).items).toHaveLength(1)
    expect((await service.listLeave(actor, {})).items[0].requesterId).toBe(
      actor.id,
    )
    expect((await service.listLeave(hr, {}, true)).total).toBe(5)
  })
  it('uses current grants instead of forged or stale actor roles', async () => {
    await expect(
      service.listLeave({ ...actor, roles: ['admin'] }, {}, true),
    ).rejects.toThrow()
    await expect(
      service.listLeave(
        { ...actor, id: 'vacation-supervisor', roles: ['supervisor'] },
        {},
        true,
      ),
    ).rejects.toThrow()
    await sql().query(
      `UPDATE "user" SET permission_overrides = '{"allow":[],"deny":["leave.review"]}' WHERE id = 'vacation-hr'`,
    )
    await expect(service.listLeave(hr, {}, true)).rejects.toThrow()
  })
  it.each(['approved', 'rejected'])(
    'lets HR and administrators decide a request: %s',
    async (action) => {
      const request = await service.createLeave(actor, input)
      await service.reviewLeave(
        action === 'approved' ? hr : administrator,
        decision(request.id, action),
      )
      const item = (await service.listLeave(actor, {})).items[0]
      expect(item.status).toBe(action)
      expect(item.reviewReason).toBe('განხილვის მიზეზი')
      expect(
        (
          await sql().query(
            'select action from leave_audit order by created_at, id',
          )
        ).rows.map((auditRow) => auditRow.action),
      ).toEqual(['created', action])
      await expect(
        service.reviewLeave(hr, decision(request.id, 'modified')),
      ).rejects.toThrow('შეიცვალა')
    },
  )
  it('preserves pending status after date edits, audits original dates, and rejects stale decisions', async () => {
    const request = await service.createLeave(actor, {
      ...input,
      kind: 'vacation',
    })
    await service.reviewLeave(hr, {
      ...decision(request.id, 'modified'),
      endDate: '2026-11-12',
    })
    expect((await service.listLeave(actor, {})).items[0]).toMatchObject({
      status: 'pending',
      revision: 1,
      endDate: '2026-11-12',
    })
    const audit = (
      await sql().query(
        `select "before", "after" from leave_audit where action = 'modified'`,
      )
    ).rows[0]
    expect(audit.before.endDate).toBe('2026-11-09')
    expect(audit.after.endDate).toBe('2026-11-12')
    await expect(
      service.reviewLeave(administrator, decision(request.id)),
    ).rejects.toThrow('შეიცვალა')
    await service.reviewLeave(administrator, {
      ...decision(request.id),
      revision: 1,
      endDate: '2026-11-12',
    })
  })
  it('rejects self-review and unauthorized direct review mutations', async () => {
    const request = await service.createLeave(hr, input)
    await expect(service.reviewLeave(hr, decision(request.id))).rejects.toThrow(
      'საკუთარი',
    )
    await expect(
      service.reviewLeave(actor, decision(request.id)),
    ).rejects.toThrow()
    await expect(
      service.reviewLeave(null, decision(request.id)),
    ).rejects.toThrow()
  })
  it('serializes overlapping submissions and competing decisions with one audit per confirmed write', async () => {
    const submissions = await Promise.allSettled([
      service.createLeave(actor, input),
      service.createLeave(actor, input),
    ])
    expect(
      submissions.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    const request = (await service.listLeave(actor, {})).items[0]
    const reviews = await Promise.allSettled([
      service.reviewLeave(hr, decision(request.id)),
      service.reviewLeave(administrator, decision(request.id, 'rejected')),
    ])
    expect(
      reviews.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect(
      (await sql().query('select count(*)::int as total from leave_audit'))
        .rows[0].total,
    ).toBe(2)
  })
  it('blocks conflicting date edits and permits a new request after rejection', async () => {
    const first = await service.createLeave(actor, input)
    const second = await service.createLeave(actor, {
      ...input,
      kind: 'vacation',
      startDate: '2026-11-12',
      endDate: '2026-11-12',
    })
    await expect(
      service.reviewLeave(hr, {
        ...decision(second.id, 'modified'),
        startDate: input.startDate,
        endDate: '2026-11-12',
      }),
    ).rejects.toThrow('ემთხვევა')
    await service.reviewLeave(hr, decision(first.id, 'rejected'))
    await expect(service.createLeave(actor, input)).resolves.toHaveProperty(
      'id',
    )
  })
  it('enforces a single day for submissions and reviews using the persisted request type', async () => {
    await expect(
      service.createLeave(actor, { ...input, endDate: '2026-11-10' }),
    ).rejects.toThrow('მხოლოდ ერთი')
    const request = await service.createLeave(actor, input)
    await expect(
      service.reviewLeave(hr, {
        ...decision(request.id),
        kind: 'vacation',
        endDate: '2026-11-10',
      }),
    ).rejects.toThrow('მხოლოდ ერთი')
    await service.reviewLeave(hr, {
      ...decision(request.id, 'modified'),
      startDate: '2026-11-10',
      endDate: '2026-11-10',
    })
    expect((await service.listLeave(actor, {})).items[0]).toMatchObject({
      kind: 'day_off',
      startDate: '2026-11-10',
      endDate: '2026-11-10',
      status: 'pending',
    })
  })
  it('lets the requester cancel an unreviewed request, retains history, and frees the dates', async () => {
    const request = await service.createLeave(actor, input)
    expect((await service.listLeave(actor, {})).items[0].canCancel).toBe(true)
    expect((await service.listLeave(hr, {}, true)).items[0].canCancel).toBe(
      false,
    )
    await service.cancelLeave(actor, { id: request.id, revision: 0 })
    expect(
      (await service.listLeave(actor, { status: 'cancelled' })).items[0],
    ).toMatchObject({
      id: request.id,
      status: 'cancelled',
      canCancel: false,
      revision: 1,
      reviewReason: '',
      reviewerName: null,
    })
    const history = (
      await sql().query(
        `select actor_id, action, "before", "after" from leave_audit where action = 'cancelled'`,
      )
    ).rows[0]
    expect(history).toMatchObject({
      actor_id: actor.id,
      action: 'cancelled',
      before: { status: 'pending' },
      after: { status: 'cancelled' },
    })
    await expect(
      service.cancelLeave(actor, { id: request.id, revision: 1 }),
    ).rejects.toThrow('გაუქმება შეუძლებელია')
    await expect(
      service.reviewLeave(hr, { ...decision(request.id), revision: 1 }),
    ).rejects.toThrow('შეიცვალა')
    await expect(service.createLeave(actor, input)).resolves.toHaveProperty(
      'id',
    )
  })
  it('denies anonymous, inactive, other-account and stale cancellation calls', async () => {
    const request = await service.createLeave(actor, input)
    const data = { id: request.id, revision: 0 }
    await expect(service.cancelLeave(null, data)).rejects.toThrow()
    await expect(service.cancelLeave(hr, data)).rejects.toThrow()
    await expect(service.cancelLeave(administrator, data)).rejects.toThrow()
    await expect(
      service.cancelLeave(actor, { ...data, revision: 1 }),
    ).rejects.toThrow('გაუქმება შეუძლებელია')
    await sql().query(
      `UPDATE "user" SET access_state = 'suspended' WHERE id = 'vacation-employee'`,
    )
    await expect(service.cancelLeave(actor, data)).rejects.toThrow()
    expect(
      (await sql().query('select status from leave_request')).rows[0].status,
    ).toBe('pending')
  })
  it.each(['approved', 'rejected', 'modified'])(
    'forbids cancellation after review, including pending date edits: %s',
    async (action) => {
      const request = await service.createLeave(actor, input)
      await service.reviewLeave(hr, {
        ...decision(request.id, action),
        ...(action === 'modified'
          ? { startDate: '2026-11-10', endDate: '2026-11-10' }
          : {}),
      })
      expect((await service.listLeave(actor, {})).items[0].canCancel).toBe(
        false,
      )
      await expect(
        service.cancelLeave(actor, { id: request.id, revision: 1 }),
      ).rejects.toThrow('გაუქმება შეუძლებელია')
    },
  )
  it('serializes cancellation against review so exactly one action and audit wins', async () => {
    const request = await service.createLeave(actor, input)
    const results = await Promise.allSettled([
      service.cancelLeave(actor, { id: request.id, revision: 0 }),
      service.reviewLeave(hr, decision(request.id)),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect(['approved', 'cancelled']).toContain(
      (await service.listLeave(actor, {})).items[0].status,
    )
    expect(
      (await sql().query('select count(*)::int as total from leave_audit'))
        .rows[0].total,
    ).toBe(2)
  })
  it.each(['approved', 'rejected', 'modified'])(
    'persists reviews and their audits without a description: %s',
    async (action) => {
      const request = await service.createLeave(actor, input)
      await service.reviewLeave(hr, {
        ...decision(request.id, action),
        reason: undefined,
        ...(action === 'modified'
          ? { startDate: '2026-11-10', endDate: '2026-11-10' }
          : {}),
      })
      const result = (await service.listLeave(actor, {})).items[0]
      expect(result).toMatchObject({
        status: action === 'modified' ? 'pending' : action,
        reviewReason: '',
        revision: 1,
        canCancel: false,
      })
      expect(result.reviewerName).toBeTruthy()
      expect(
        (
          await sql().query(
            'select reason from leave_audit where action = $1',
            [action],
          )
        ).rows[0].reason,
      ).toBe('')
    },
  )
  it('applies bounded server pagination, status/search filters, sorting, and matching totals', async () => {
    for (let index = 1; index <= 22; index++) {
      const date = `2026-12-${String(index).padStart(2, '0')}`
      await service.createLeave(actor, {
        ...input,
        startDate: date,
        endDate: date,
        note: index === 22 ? 'საძიებო' : '',
      })
    }
    const first = await service.listLeave(
      hr,
      { sort: 'date-asc', page: 1 },
      true,
    )
    const second = await service.listLeave(
      hr,
      { sort: 'date-asc', page: 2 },
      true,
    )
    expect(first.items).toHaveLength(20)
    expect(second.items).toHaveLength(2)
    expect(first.total).toBe(22)
    expect(second.items[0].startDate).toBe('2026-12-21')
    expect(
      (await service.listLeave(hr, { q: 'საძიებო', status: 'pending' }, true))
        .total,
    ).toBe(1)
    expect((await service.listLeave(hr, { q: '%_' }, true)).total).toBe(0)
    expect(
      (await service.listLeave(hr, { status: 'approved' }, true)).total,
    ).toBe(0)
  })
})
