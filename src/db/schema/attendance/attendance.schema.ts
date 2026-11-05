import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { createdAt, uuidv7PrimaryKey } from '#/db/schema/_shared/columns'
import { employee } from '#/db/schema/employees/employee.schema'
import { companySchedule } from '#/db/schema/scheduling/company-schedule.schema'

/** One employee's actual working interval. Multiple intervals may belong to one workday; open intervals must be resolved before another starts. History is retained. */
export const attendanceSession = pgTable(
  'attendance_session',
  {
    /** PostgreSQL 18 UUIDv7 identity; never used as proof of access. */
    id: uuidv7PrimaryKey(),
    /** Employee derived from the authenticated account; deletion cannot erase attendance. */
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employee.id, { onDelete: 'restrict' }),
    /** Client-generated operation identifier for duplicate-request detection, not a session credential or domain identity. */
    requestId: uuid('request_id').notNull(),
    /** Local calendar date of the scheduled day, preserved even if check-out happens after midnight. */
    workDate: date('work_date', { mode: 'string' }).notNull(),
    /** Named company timezone retained to format this interval after future configuration changes. */
    timezone: text('timezone').notNull(),
    /** Schedule version that supplied the expected hours; retained with a restrictive foreign key. */
    scheduleEffectiveFrom: date('schedule_effective_from', { mode: 'string' })
      .notNull()
      .references(() => companySchedule.effectiveFrom, {
        onDelete: 'restrict',
      }),
    /** Expected start UTC instant captured when the employee checks in, without a grace period. */
    expectedStartAt: timestamp('expected_start_at', {
      withTimezone: true,
    }).notNull(),
    /** Expected end UTC instant captured alongside the expected start; actual work may continue beyond it. */
    expectedEndAt: timestamp('expected_end_at', {
      withTimezone: true,
    }).notNull(),
    /** Actual check-in UTC instant supplied by the application server, never by the browser. */
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    /** Actual check-out UTC instant from the server; null until an explicit successful check-out. */
    endedAt: timestamp('ended_at', { withTimezone: true }),
    /** Original server punch retained when a manager corrects the effective interval. */
    originalStartedAt: timestamp('original_started_at', { withTimezone: true }),
    /** Original checkout remains null when a manager resolves a forgotten checkout. */
    originalEndedAt: timestamp('original_ended_at', { withTimezone: true }),
    /** Optimistic version incremented by checkout, correction and review. */
    revision: integer('revision').notNull().default(0),
    /** Review of the current effective interval; correction always returns it to pending. */
    reviewState: text('review_state').notNull().default('pending'),
    /** Explicit approved outside-schedule attendance seconds; no automatic overtime grant. */
    approvedOutsideSeconds: integer('approved_outside_seconds')
      .notNull()
      .default(0),
    /** Warning threshold captured at check-in; exceeding it never fabricates checkout. */
    maxOpenHours: integer('max_open_hours').notNull().default(16),
    /** Database-generated UTC insert time, distinct from actual worked times. */
    createdAt: createdAt(),
  },
  (table) => [
    check(
      'attendance_review_state_valid',
      sql`${table.reviewState} in ('pending', 'approved', 'rejected')`,
    ),
    check(
      'attendance_review_values_valid',
      sql`${table.revision} >= 0 and ${table.approvedOutsideSeconds} >= 0 and (${table.reviewState} = 'approved' or ${table.approvedOutsideSeconds} = 0) and ${table.maxOpenHours} between 8 and 72`,
    ),
    // Also protects concurrent requests independently of application-level employee row locks.
    uniqueIndex('attendance_one_open_session')
      .on(table.employeeId)
      .where(sql`${table.endedAt} is null`),
    uniqueIndex('attendance_request_once').on(
      table.employeeId,
      table.requestId,
    ),
    index('attendance_employee_recent').on(
      table.employeeId,
      table.workDate,
      table.startedAt,
    ),
    check(
      'attendance_actual_interval_valid',
      sql`${table.endedAt} is null or ${table.endedAt} >= ${table.startedAt}`,
    ),
    check(
      'attendance_expected_interval_valid',
      sql`${table.expectedEndAt} > ${table.expectedStartAt}`,
    ),
  ],
)
