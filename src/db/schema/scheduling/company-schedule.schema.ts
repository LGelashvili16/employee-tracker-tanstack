import { sql } from 'drizzle-orm'
import {
  check,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  time,
} from 'drizzle-orm/pg-core'
import { createdAt } from '#/db/schema/_shared/columns'
import { user } from '#/db/schema/auth/auth.schema'

/** One effective-dated company default schedule. Retain effective versions to interpret historical attendance; later versions supersede rather than overwrite them. */
export const companySchedule = pgTable(
  'company_schedule',
  {
    /** Company-local first applicable date; natural key allows only one default version per date. No end date: the next version supersedes this one. */
    effectiveFrom: date('effective_from', { mode: 'string' }).primaryKey(),
    /** Named timezone used to interpret local weekly hours, such as Asia/Tbilisi; timestamps alone do not retain this name. */
    timezone: text('timezone').notNull(),
    /** Historical late-arrival tolerance in minutes, retained for old versions; the service requires zero for new schedules. */
    lateGraceMinutes: integer('late_grace_minutes').notNull(),
    /** Historical early-departure tolerance in minutes, retained for old versions; new schedules use zero. */
    earlyDepartureGraceMinutes: integer(
      'early_departure_grace_minutes',
    ).notNull(),
    /** Minutes before the scheduled start to remind an employee; defaults to five. Zero means at the start, not disabled. Delivery is implemented separately. */
    reminderMinutesBefore: integer('reminder_minutes_before')
      .notNull()
      .default(5),
    /** Minutes before scheduled end for the check-out reminder, 0-60. Zero defaults to reminding at the end, not disabling delivery. */
    checkoutReminderMinutesBefore: integer('checkout_reminder_minutes_before')
      .notNull()
      .default(0),
    /** UTC instant when this version was inserted; database-generated and timezone-aware. */
    createdAt: createdAt(),
  },
  (table) => [
    check(
      'company_schedule_timezone_nonempty',
      sql`length(trim(${table.timezone})) between 1 and 100`,
    ),
    check(
      'company_schedule_late_grace_valid',
      sql`${table.lateGraceMinutes} between 0 and 60`,
    ),
    check(
      'company_schedule_early_grace_valid',
      sql`${table.earlyDepartureGraceMinutes} between 0 and 60`,
    ),
    check(
      'company_schedule_reminder_valid',
      sql`${table.reminderMinutesBefore} between 0 and 60`,
    ),
    check(
      'company_schedule_checkout_reminder_valid',
      sql`${table.checkoutReminderMinutesBefore} between 0 and 60`,
    ),
  ],
)

/** One ISO weekday in a company schedule version. The schedule service must insert all seven days atomically; null hours explicitly mean a nonworking day. */
export const companyScheduleDay = pgTable(
  'company_schedule_day',
  {
    /** Owning schedule version; deletion is restricted so a version cannot silently lose its weekday history. */
    effectiveFrom: date('effective_from', { mode: 'string' })
      .notNull()
      .references(() => companySchedule.effectiveFrom, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    /** ISO weekday, Monday = 1 through Sunday = 7; part of the natural key. */
    weekday: integer('weekday').notNull(),
    /** Local start time at minute precision in the version's named timezone; null on a nonworking day. This is a recurring wall-clock time, not an instant. */
    startTime: time('start_time', { precision: 0 }),
    /** Local same-day end time at minute precision; null exactly when startTime is null. Overnight shifts require a separate workflow. */
    endTime: time('end_time', { precision: 0 }),
  },
  (table) => [
    primaryKey({ columns: [table.effectiveFrom, table.weekday] }),
    check(
      'company_schedule_day_weekday_valid',
      sql`${table.weekday} between 1 and 7`,
    ),
    check(
      'company_schedule_day_hours_valid',
      sql`(${table.startTime} is null and ${table.endTime} is null) or (${table.startTime} is not null and ${table.endTime} is not null and ${table.startTime} < ${table.endTime} and extract(second from ${table.startTime}) = 0 and extract(second from ${table.endTime}) = 0 and ${table.endTime} < time '24:00:00')`,
    ),
  ],
)

/** One immutable creation audit per schedule version. The service inserts it with the version and weekdays in the same transaction. */
export const companyScheduleAudit = pgTable(
  'company_schedule_audit',
  {
    /** Version created by this action; one creation action per version, retained with restricted deletion. */
    effectiveFrom: date('effective_from', { mode: 'string' })
      .primaryKey()
      .references(() => companySchedule.effectiveFrom, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
    /** Trusted authenticated account that authorized the new version; deletion cannot erase audit identity. */
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Server-generated Georgian action description, 5-500 characters; retained in the existing reason column for audit history. */
    reason: text('reason').notNull(),
    /** UTC creation instant generated by the database with timezone support. */
    createdAt: createdAt(),
  },
  (table) => [
    check(
      'company_schedule_audit_reason_valid',
      sql`length(trim(${table.reason})) between 5 and 500`,
    ),
  ],
)
