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
import { companyLocalDate, followingDate } from './scheduling.rules'
import type { Actor } from '#/lib/authorization/actor'
import type * as ScheduleService from './server/scheduling.service.server'
import type { db as Database } from '#/db'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const originalUrl = process.env.DATABASE_URL
let service: typeof ScheduleService
let applicationDatabase: typeof Database | undefined

const enabled = process.env.RUN_SCHEDULE_DB_TESTS === '1'
const databaseName = `teamwork_schedule_test_${randomBytes(8).toString('hex')}`
let admin: pg.Client | undefined
let connection: pg.Client | undefined
let created = false

function database() {
  if (!connection) throw new Error('Isolated test database is unavailable')
  return connection
}

describe.runIf(enabled)('company schedule PostgreSQL integrity', () => {
  beforeAll(async () => {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('Local test database configuration is required')
    const target = new URL(url)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
      throw new Error('Schedule integration tests require local PostgreSQL')
    }
    admin = new pg.Client({
      connectionString: url,
      connectionTimeoutMillis: 3000,
    })
    await admin.connect()
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    created = true
    target.pathname = `/${databaseName}`
    connection = new pg.Client({ connectionString: target.toString() })
    await connection.connect()
    for (const file of readdirSync('drizzle')
      .filter((name) => /^\d+.*\.sql$/.test(name))
      .sort()) {
      await connection.query(
        readFileSync(`drizzle/${file}`, 'utf8').replaceAll(
          '--> statement-breakpoint',
          '',
        ),
      )
    }
    await connection.query(
      `INSERT INTO company_schedule (effective_from, timezone, late_grace_minutes, early_departure_grace_minutes) VALUES ('2026-11-04', 'Asia/Tbilisi', 5, 0)`,
    )
    process.env.DATABASE_URL = target.toString()
    service = await import('./server/scheduling.service.server')
    applicationDatabase = (await import('#/db')).db
    await connection.query(
      `INSERT INTO "user" (id, name, email, roles) VALUES ('schedule-admin', 'ადმინისტრატორი', 'schedule@example.invalid', 'admin'), ('schedule-worker', 'თანამშრომელი', 'worker@example.invalid', 'employee')`,
    )
  }, 30_000)

  afterAll(async () => {
    await applicationDatabase?.$client.end()
    process.env.DATABASE_URL = originalUrl
    await connection?.end()
    if (admin) {
      if (created)
        await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`)
      await admin.end()
    }
  })

  it('stores creation instants with timezone and defaults to a five-minute reminder', async () => {
    const result = await database().query(
      `SELECT pg_typeof(created_at)::text AS type, reminder_minutes_before, checkout_reminder_minutes_before FROM company_schedule`,
    )
    expect(result.rows).toEqual([
      {
        type: 'timestamp with time zone',
        reminder_minutes_before: 5,
        checkout_reminder_minutes_before: 0,
      },
    ])
  })

  it('allows explicit nonworking days and same-day working hours', async () => {
    await database().query(
      `INSERT INTO company_schedule_day VALUES ('2026-11-04', 1, '09:00', '18:00'), ('2026-11-04', 7, NULL, NULL)`,
    )
  })

  it.each([
    [2, '18:00', '09:00'],
    [2, '09:00', '09:00'],
    [2, '09:00', null],
    [2, null, '18:00'],
    [2, '09:00:01', '18:00'],
    [2, '09:00', '24:00'],
    [8, '09:00', '18:00'],
  ])('rejects invalid weekday/hours %j %j %j', async (weekday, start, end) => {
    await expect(
      database().query(
        `INSERT INTO company_schedule_day VALUES ('2026-11-04', $1, $2, $3)`,
        [weekday, start, end],
      ),
    ).rejects.toMatchObject({ code: '23514' })
  })

  it('rejects orphan weekdays', async () => {
    await expect(
      database().query(
        `INSERT INTO company_schedule_day VALUES ('2027-01-01', 1, '09:00', '18:00')`,
      ),
    ).rejects.toMatchObject({ code: '23503' })
  })

  it('rejects duplicate versions and invalid grace settings', async () => {
    await expect(
      database().query(
        `INSERT INTO company_schedule (effective_from, timezone, late_grace_minutes, early_departure_grace_minutes) VALUES ('2026-11-04', 'UTC', 0, 0)`,
      ),
    ).rejects.toMatchObject({ code: '23505' })
    await expect(
      database().query(
        `INSERT INTO company_schedule (effective_from, timezone, late_grace_minutes, early_departure_grace_minutes) VALUES ('2027-01-01', 'UTC', -1, 0)`,
      ),
    ).rejects.toMatchObject({ code: '23514' })
  })

  it('protects weekday uniqueness and prevents deleting referenced history', async () => {
    await database().query(
      `INSERT INTO company_schedule_day VALUES ('2026-11-04', 3, '09:00', '18:00')`,
    )
    await expect(
      database().query(
        `INSERT INTO company_schedule_day VALUES ('2026-11-04', 3, NULL, NULL)`,
      ),
    ).rejects.toMatchObject({ code: '23505' })
    await expect(
      database().query(
        `DELETE FROM company_schedule WHERE effective_from = '2026-11-04'`,
      ),
    ).rejects.toMatchObject({ code: '23001' })
  })

  describe('authorized schedule workflow', () => {
    const actor: Actor = {
      id: 'schedule-admin',
      name: 'ადმინისტრატორი',
      email: null,
      emailVerified: false,
      roles: ['admin'],
    }
    function input() {
      return {
        effectiveFrom: companyLocalDate(new Date(), 'Asia/Tbilisi'),
        timezone: 'Asia/Tbilisi',
        lateGraceMinutes: 0,
        earlyDepartureGraceMinutes: 0,
        reminderMinutesBefore: 5,
        days: Array.from({ length: 7 }, (_, index) => ({
          weekday: index + 1,
          hours: index < 5 ? { start: '09:00', end: '18:00' } : null,
        })),
      }
    }
    beforeEach(async () => {
      await database().query(
        'DELETE FROM company_schedule_audit; DELETE FROM company_schedule_day; DELETE FROM company_schedule;',
      )
      await database().query(
        `UPDATE "user" SET access_state = 'active', roles = 'admin' WHERE id = 'schedule-admin'`,
      )
    })

    it('denies missing actors and forged grants on direct reads and writes', async () => {
      for (const denied of [
        null,
        { ...actor, id: 'schedule-worker', roles: ['owner'] as Actor['roles'] },
      ]) {
        await expect(service.readScheduleSettings(denied)).rejects.toThrow()
        await expect(
          service.saveScheduleVersion(denied, input()),
        ).rejects.toThrow()
      }
      expect(
        (await database().query('SELECT * FROM company_schedule')).rows,
      ).toHaveLength(0)
    })

    it('denies a suspended administrator and inactive employee despite stale actor grants', async () => {
      await database().query(
        `UPDATE "user" SET access_state = 'suspended' WHERE id = 'schedule-admin'`,
      )
      await expect(
        service.saveScheduleVersion(actor, input()),
      ).rejects.toThrow()
      await database().query(
        `UPDATE "user" SET access_state = 'active' WHERE id = 'schedule-admin'`,
      )
      await database().query(
        `INSERT INTO employee (username, user_id, full_name, status) VALUES ('schedule-admin', 'schedule-admin', 'ადმინისტრატორი', 'inactive')`,
      )
      try {
        await expect(
          service.saveScheduleVersion(actor, input()),
        ).rejects.toThrow()
      } finally {
        await database().query(
          `DELETE FROM employee WHERE user_id = 'schedule-admin'`,
        )
      }
    })

    it('returns an explicit unconfigured state and atomically saves seven weekdays with an audit', async () => {
      expect((await service.readScheduleSettings(actor)).current).toBeNull()
      const value = input()
      await service.saveScheduleVersion(actor, value)
      const settings = await service.readScheduleSettings(actor)
      expect(settings.current?.days).toEqual(value.days)
      expect(settings.minimumEffectiveFrom).toBe(
        followingDate(value.effectiveFrom),
      )
      expect(
        (
          await database().query(
            'SELECT actor_id, reason FROM company_schedule_audit',
          )
        ).rows,
      ).toEqual([
        { actor_id: actor.id, reason: 'კომპანიის სამუშაო განრიგის შენახვა.' },
      ])
    })

    it('keeps the current version when a future one is added and rejects history rewrites and timezone changes', async () => {
      const value = input()
      await service.saveScheduleVersion(actor, value)
      await expect(service.saveScheduleVersion(actor, value)).rejects.toThrow()
      await expect(
        service.saveScheduleVersion(actor, {
          ...value,
          effectiveFrom: '2020-01-01',
        }),
      ).rejects.toThrow()
      await expect(
        service.saveScheduleVersion(actor, {
          ...value,
          timezone: 'UTC',
          effectiveFrom: followingDate(value.effectiveFrom),
        }),
      ).rejects.toThrow()
      await service.saveScheduleVersion(actor, {
        ...value,
        effectiveFrom: followingDate(value.effectiveFrom),
        checkoutReminderMinutesBefore: 10,
      })
      const settings = await service.readScheduleSettings(actor)
      expect(settings.current?.checkoutReminderMinutesBefore).toBe(0)
      expect(settings.upcoming[0]?.checkoutReminderMinutesBefore).toBe(10)
      expect(settings.upcoming[0]?.lateGraceMinutes).toBe(0)
      expect(settings.upcoming[0]?.earlyDepartureGraceMinutes).toBe(0)
    })

    it('serializes competing first saves so only one version and audit are committed', async () => {
      const results = await Promise.allSettled([
        service.saveScheduleVersion(actor, input()),
        service.saveScheduleVersion(actor, input()),
      ])
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1)
      expect(
        (await database().query('SELECT * FROM company_schedule_day')).rows,
      ).toHaveLength(7)
      expect(
        (await database().query('SELECT * FROM company_schedule_audit')).rows,
      ).toHaveLength(1)
    })

    it('rolls back schedule and days when audit persistence fails', async () => {
      await database().query(
        `ALTER TABLE company_schedule_audit ADD CONSTRAINT test_reject_audit CHECK (false)`,
      )
      try {
        await expect(
          service.saveScheduleVersion(actor, {
            ...input(),
          }),
        ).rejects.toThrow()
        expect(
          (await database().query('SELECT * FROM company_schedule')).rows,
        ).toHaveLength(0)
        expect(
          (await database().query('SELECT * FROM company_schedule_day')).rows,
        ).toHaveLength(0)
      } finally {
        await database().query(
          'ALTER TABLE company_schedule_audit DROP CONSTRAINT test_reject_audit',
        )
      }
    })

    it('revalidates malformed input without leaving partial data', async () => {
      await expect(
        service.saveScheduleVersion(actor, {
          ...input(),
          days: [],
        }),
      ).rejects.toThrow()
      expect(
        (await database().query('SELECT * FROM company_schedule')).rows,
      ).toHaveLength(0)
    })
  })
})
