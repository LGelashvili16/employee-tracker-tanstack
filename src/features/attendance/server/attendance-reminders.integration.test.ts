// @vitest-environment node
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type * as Service from './attendance-reminders.service.server'
import type { db as Database } from '#/db'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const enabled = process.env.RUN_NOTIFICATION_REMINDERS_DB_TESTS === '1'
const originalUrl = process.env.DATABASE_URL
const databaseName = `teamwork_reminders_test_${randomBytes(8).toString('hex')}`
let admin: pg.Client | undefined
let connection: pg.Client | undefined
let database: typeof Database | undefined
let service: typeof Service
let created = false
function sql() {
  if (!connection) throw new Error('Isolated database is unavailable')
  return connection
}

describe.runIf(enabled)('durable reminders against PostgreSQL', () => {
  beforeAll(async () => {
    if (!originalUrl)
      throw new Error('Local PostgreSQL configuration is required')
    const target = new URL(originalUrl)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
      throw new Error('Tests require local PostgreSQL')
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
      .sort()) {
      await sql().query(
        readFileSync(`drizzle/${file}`, 'utf8').replaceAll(
          '--> statement-breakpoint',
          '',
        ),
      )
    }
    // Migration defaults require the same PostgreSQL 18 UUIDv7 support as production.
    expect((await sql().query('select uuidv7() as id')).rows[0].id).toMatch(
      /^[0-9a-f-]{36}$/,
    )
    process.env.DATABASE_URL = target.toString()
    service = await import('./attendance-reminders.service.server')
    database = (await import('#/db')).db
    await sql().query(
      "insert into company_schedule(effective_from,timezone,late_grace_minutes,early_departure_grace_minutes,reminder_minutes_before) values ('2031-01-01','Asia/Tbilisi',0,0,0),('2031-01-02','Asia/Tbilisi',0,0,30)",
    )
    await sql().query(
      "insert into company_schedule_day select effective_from,d,'09:00','17:00' from company_schedule cross join generate_series(1,7) d",
    )
  }, 30000)
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

  const run = (time: string) => service.runAttendanceReminders(new Date(time))
  const employees = async (ids: string[]) => {
    await sql().query(
      'insert into "user"(id,name,email) select id,id,id||\'@reminders.invalid\' from unnest($1::text[]) id',
      [ids],
    )
    await sql().query(
      'insert into employee(user_id,username,full_name) select id,id,id from unnest($1::text[]) id',
      [ids],
    )
  }
  it('uses effective company and custom hours, midnight leads, zero minutes, absences and bounded catch-up', async () => {
    await employees(['night', 'morning', 'absent', 'offday', 'punched', 'busy'])
    await sql().query(
      "insert into employee_work_schedule(employee_id,assigned_by,days) select id,user_id,(select jsonb_agg(jsonb_build_object('weekday',d,'hours',case when user_id='night' then jsonb_build_object('start','00:10','end','02:00') end)) from generate_series(1,7) d) from employee where user_id in ('offday','night')",
    )
    await sql().query(
      "insert into leave_request(requester_id,kind,start_date,status,reviewer_id,reviewed_at) values('absent','sick_leave','2031-01-01','approved','morning',now())",
    )
    await sql().query(
      "insert into attendance_session(employee_id,request_id,work_date,timezone,schedule_effective_from,expected_start_at,expected_end_at,started_at,ended_at) select id,uuidv7(),case when user_id='busy' then date '2030-12-31' else date '2031-01-01' end,'Asia/Tbilisi','2031-01-01','2031-01-01 04:00Z','2031-01-01 04:00Z','2031-01-01 04:00Z',case when user_id='punched' then timestamptz '2031-01-01 04:30Z' end from employee where user_id in ('busy','punched')",
    )
    expect(await run('2031-01-01T04:59Z')).toBe(0)
    const runs = await Promise.all([
      run('2031-01-01T05:00Z'),
      run('2031-01-01T05:00Z'),
    ])
    expect(runs.reduce((a, b) => a + b, 0)).toBe(1)
    expect(await run('2031-01-01T05:01Z')).toBe(0)
    expect(await run('2031-01-01T19:40Z')).toBe(1)
    expect(
      (
        await sql().query(
          "select recipient_id,destination->>'workDate' as day from notification where event_key like 'checkin:%' order by recipient_id",
        )
      ).rows,
    ).toEqual([
      { recipient_id: 'morning', day: '2031-01-01' },
      { recipient_id: 'night', day: '2031-01-02' },
    ])
    await sql().query(
      'update attendance_session set ended_at=started_at where ended_at is null',
    )
    expect(await run('2031-01-02T15:00Z')).toBe(0)
  })
  it('retains session schedule and work date, restricts reviewers, and delivers newly pending revisions without repeat backlog', async () => {
    await employees([
      'subject',
      'manager',
      'denied',
      'noaccess',
      'noread',
      'later',
      'operator',
      'malformed',
    ])
    await sql()
      .query(`update "user" set roles='supervisor' where id in ('manager','denied','noaccess','noread','later','subject','malformed');
      update "user" set roles=E'\\t employee , supervisor \\n',permission_overrides='null'::jsonb where id='manager';
      update "user" set permission_overrides='{"allow":[],"deny":["unknown"]}' where id='malformed';
      update "user" set permission_overrides='{"allow":[],"deny":["attendance.review.team"]}' where id='denied';
      update "user" set permission_overrides='{"allow":[],"deny":["manage.access"]}' where id='noaccess';
      update "user" set permission_overrides='{"allow":[],"deny":["attendance.read.team"]}' where id='noread';
      insert into attendance_reviewer (reviewer_id,employee_id) select u.id,e.id from "user" u cross join employee e where e.user_id='subject' and u.id in ('manager','denied','noaccess','noread','subject','malformed');
      update company_schedule set checkout_reminder_minutes_before=60 where effective_from='2031-01-02';
      insert into attendance_session(employee_id,request_id,work_date,timezone,schedule_effective_from,expected_start_at,expected_end_at,started_at,max_open_hours)
      select id,uuidv7(),'2031-01-01','Asia/Tbilisi','2031-01-01','2031-01-01 15:00Z','2031-01-01 20:00Z','2031-01-01 15:00Z',8 from employee where user_id='subject'`)
    await run('2031-01-01T19:59Z')
    expect(
      (
        await sql().query(
          "select id from notification where event_key like 'checkout:%'",
        )
      ).rowCount,
    ).toBe(0)
    await run('2031-01-01T23:05Z')
    const alerts = await sql().query(
      "select recipient_id,destination->>'workDate' as day from notification where event_key like 'excessive:%' order by recipient_id",
    )
    expect(alerts.rows).toEqual([
      { recipient_id: 'manager', day: '2031-01-01' },
      { recipient_id: 'subject', day: '2031-01-01' },
    ])
    expect(
      (
        await sql().query(
          "select recipient_id from notification where event_key like 'checkout:%'",
        )
      ).rows,
    ).toEqual([{ recipient_id: 'subject' }])
    await sql().query(
      "update attendance_session set ended_at='2031-01-01 23:06Z',revision=1 where ended_at is null",
    )
    await sql().query(
      'alter table attendance_digest_receipt add constraint force_rollback check (revision<1)',
    )
    await expect(run('2031-01-01T23:07Z')).rejects.toThrow()
    expect(
      (
        await sql().query(
          "select id from notification where event_key like 'review-digest:%'",
        )
      ).rowCount,
    ).toBe(0)
    await sql().query(
      'alter table attendance_digest_receipt drop constraint force_rollback',
    )
    expect(await run('2031-01-01T23:08Z')).toBe(1)
    await sql().query(
      "update notification set seen_at=now() where event_key like 'review-digest:%';update attendance_session set revision=3 where revision=1",
    )
    expect(await run('2031-01-01T23:20Z')).toBe(0)
    await sql().query(
      "insert into attendance_reviewer(reviewer_id,employee_id) select 'later',id from employee where user_id='subject'",
    )
    expect(await run('2031-01-02T00:01Z')).toBe(2)
    expect(await run('2031-01-02T01:01Z')).toBe(0)
    expect(
      (
        await sql().query(
          "select recipient_id,live_toast from notification where event_key like 'review-digest:%' order by recipient_id",
        )
      ).rows,
    ).toEqual(
      ['later', 'manager', 'manager'].map((recipient_id) => ({
        recipient_id,
        live_toast: false,
      })),
    )
    const { assignAttendanceReviewer } =
      await import('./attendance-configuration.service.server')
    await sql().query("update \"user\" set roles='admin' where id='operator'")
    const actor = {
      id: 'operator',
      name: 'ოპერატორი',
      email: null,
      emailVerified: false,
      roles: ['admin'] as Array<'admin'>,
    }
    const person = (
      await sql().query("select id from employee where user_id='subject'")
    ).rows[0] as { id: string }
    const assignment = {
      reviewerId: 'manager',
      employeeId: person.id,
      reason: 'ხელმძღვანელის ცვლილება',
    }
    await assignAttendanceReviewer(actor, { ...assignment, revoke: true })
    await assignAttendanceReviewer(actor, { ...assignment, revoke: false })
    expect(await run('2031-01-02T01:02Z')).toBe(1)
    expect(await run('2031-01-02T02:02Z')).toBe(0)
    await sql().query(
      "update employee set status='inactive' where user_id='subject';insert into attendance_session(employee_id,request_id,work_date,timezone,schedule_effective_from,expected_start_at,expected_end_at,started_at,max_open_hours) select id,uuidv7(),'2031-01-01','Asia/Tbilisi','2031-01-01','2031-01-01 15:00Z','2031-01-01 15:00Z','2031-01-01 15:00Z',8 from employee where user_id='subject'",
    )
    expect(await run('2031-01-02T02:03Z')).toBe(2)
    expect(
      (
        await sql().query(
          "select recipient_id,count(*)::int as n from notification where event_key like 'excessive:%' group by recipient_id order by recipient_id",
        )
      ).rows,
    ).toEqual([
      { recipient_id: 'later', n: 1 },
      { recipient_id: 'manager', n: 2 },
      { recipient_id: 'subject', n: 1 },
    ])
  })
  it('skips an invalid custom week as a whole while other reminders commit', async () => {
    const invalid = [
      'badweekday',
      'badtime',
      'badoffdate',
      'duplicate',
      'missing',
      'reverse',
    ]
    await employees([...invalid, 'aaa-valid', 'aaa-finish'])
    for (const name of invalid) {
      const days = Array.from({ length: 7 }, (_, i) => ({
        weekday: i + 1,
        hours: { start: '09:00', end: '17:00' },
      }))
      const malformed: unknown[] = [...days]
      // January 3 is Friday. An invalid Monday must also disqualify an otherwise valid Friday.
      const index = name === 'badoffdate' ? 0 : 4
      const replacements: Record<string, unknown> = {
        badweekday: { ...days[index], weekday: 'oops' },
        badtime: { ...days[index], hours: { start: '88:22', end: '20:00' } },
        badoffdate: { ...days[index], hours: { start: '09:00', end: '25:00' } },
        duplicate: { ...days[index], weekday: 1 },
        missing: { weekday: 5 },
        reverse: { weekday: 5, hours: { start: '13:00', end: '12:00' } },
      }
      malformed[index] = replacements[name]
      await sql().query(
        'insert into employee_work_schedule(employee_id,assigned_by,days) select id,user_id,$2::jsonb from employee where user_id=$1',
        [name, JSON.stringify(malformed)],
      )
    }
    await sql().query(
      "insert into attendance_session(employee_id,request_id,work_date,timezone,schedule_effective_from,expected_start_at,expected_end_at,started_at) select id,uuidv7(),'2031-01-03','Asia/Tbilisi','2031-01-01','2031-01-03 04:00Z','2031-01-03 05:00Z','2031-01-03 04:00Z' from employee where user_id='aaa-finish'",
    )
    await run('2031-01-03T05:00Z')
    expect(
      (
        await sql().query(
          "select recipient_id,split_part(event_key,':',1) kind from notification where recipient_id=any($1) order by recipient_id",
          [[...invalid, 'aaa-valid', 'aaa-finish']],
        )
      ).rows,
    ).toEqual([
      { recipient_id: 'aaa-finish', kind: 'checkout' },
      { recipient_id: 'aaa-valid', kind: 'checkin' },
    ])
  })
  it('drains a multi-page due population without letting earlier deliveries starve later employees', async () => {
    await employees(Array.from({ length: 139 }, (_, i) => 'batch' + i))
    await run('2031-01-06T05:00Z')
    const count = async () =>
      Number(
        (
          await sql().query(
            "select count(*) from notification where recipient_id like 'batch%'",
          )
        ).rows[0].count,
      )
    expect(await count()).toBeLessThanOrEqual(64)
    await run('2031-01-06T05:01Z')
    await run('2031-01-06T05:02Z')
    expect(await count()).toBe(139)
    expect(await run('2031-01-06T05:03Z')).toBe(0)
  })
})
