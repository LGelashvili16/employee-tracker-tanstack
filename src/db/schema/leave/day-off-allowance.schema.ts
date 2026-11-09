import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  boolean,
  jsonb,
  pgTable,
  text,
} from 'drizzle-orm/pg-core'
import { createdAt, timestamps, uuidv7PrimaryKey } from '../_shared/columns'
import { user } from '../auth/auth.schema'

/** Single-company policy for new employees. Toggling resets preserves current balances; annual resets use the company calendar year. */
export const dayOffSetting = pgTable(
  'day_off_setting',
  {
    /** Exactly one company policy row. */
    id: integer('id').primaryKey().default(1),
    /** Initial and annual day-off allowance copied when an employee is created, in whole days. */
    defaultDays: integer('default_days').notNull().default(4),
    /** Whether an employee's remaining balance returns to their annual allowance at a new calendar year. */
    resetYearly: boolean('reset_yearly').notNull().default(true),
    /** Annual paid-vacation entitlement for new accounts, measured in working days; the general statutory minimum is 24. */
    defaultVacationDays: integer('default_vacation_days').notNull().default(24),
    /** Optimistic version prevents stale settings edits. */
    revision: integer('revision').notNull().default(0),
  },
  (table) => [
    check(
      'day_off_setting_valid',
      sql`${table.id} = 1 and ${table.defaultDays} between 0 and 366 and ${table.revision} >= 0 and ${table.defaultVacationDays} between 24 and 366`,
    ),
  ],
)

/** One retained day-off account per login identity, independent of role. Reads derive a due annual reset; writes materialize it atomically. */
export const dayOffBalance = pgTable(
  'day_off_balance',
  {
    /** Employee's account; restrictive deletion retains balance and audit history. */
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Employee-specific annual allowance, initialized from the company default unless explicitly overridden. */
    annualDays: integer('annual_days').notNull(),
    /** Whole days available after approvals and HR adjustments in the materialized period; never negative. */
    remainingDays: integer('remaining_days').notNull(),
    /** Company-local year last materialized. Older years reset only while the company reset toggle is enabled. */
    periodYear: integer('period_year').notNull(),
    /** Paid working days added each January 1; independent of the optional day-off reset. */
    vacationAnnualDays: integer('vacation_annual_days').notNull().default(24),
    /** Remaining paid working days including unused prior grants; never automatically forfeited. */
    vacationRemainingDays: integer('vacation_remaining_days')
      .notNull()
      .default(24),
    /** Company-local year through which annual paid-vacation additions have been materialized. */
    vacationPeriodYear: integer('vacation_period_year')
      .notNull()
      .default(sql`extract(year from now() at time zone 'Asia/Tbilisi')::int`),
    /** Revision changes on consumption, reset, or an HR adjustment to reject stale edits. */
    revision: integer('revision').notNull().default(0),
    ...timestamps(),
  },
  (table) => [
    check(
      'day_off_balance_valid',
      sql`${table.annualDays} between 0 and 366 and ${table.remainingDays} between 0 and 3660 and ${table.periodYear} between 2000 and 2100 and ${table.revision} >= 0 and ${table.vacationAnnualDays} between 24 and 366 and ${table.vacationRemainingDays} between 0 and 100000 and ${table.vacationPeriodYear} between 2000 and 2100`,
    ),
  ],
)

/** Append-only allowance history. Grants, resets, approvals, HR adjustments, and company-policy edits commit with their before/after facts. */
export const dayOffAllowanceAudit = pgTable(
  'day_off_allowance_audit',
  {
    /** PostgreSQL 18 time-ordered audit identity. */
    id: uuidv7PrimaryKey(),
    /** Acting account; null identifies initial migration/bootstrap or an automatic annual reset. */
    actorId: text('actor_id').references(() => user.id, {
      onDelete: 'restrict',
    }),
    /** Account whose balance changed; null identifies the single company policy. */
    targetUserId: text('target_user_id').references(() => user.id, {
      onDelete: 'restrict',
    }),
    /** Stable allowance operation: initialized, adjusted, reset, consumed, configured, vacation_initialized, vacation_credited, or vacation_consumed. */
    action: text('action').notNull(),
    /** Administrative explanation or a fixed workflow description; never credentials. */
    reason: text('reason').notNull(),
    /** Minimal previous allowance facts; null for initialization. */
    before: jsonb('before'),
    /** Minimal resulting allowance facts, optionally including the related request identifier. */
    after: jsonb('after').notNull(),
    /** Authoritative UTC time of the recorded change. */
    createdAt: createdAt(),
  },
  (table) => [
    index('day_off_allowance_audit_target').on(
      table.targetUserId,
      table.createdAt,
    ),
  ],
)
