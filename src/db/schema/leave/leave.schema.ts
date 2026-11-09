import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { createdAt, timestamps, uuidv7PrimaryKey } from '../_shared/columns'
import { user } from '../auth/auth.schema'

/** One account's inclusive, date-only absence request. Decisions close pending requests; history is retained. */
export const leaveRequest = pgTable(
  'leave_request',
  {
    /** PostgreSQL 18 time-ordered identifier. */
    id: uuidv7PrimaryKey(),
    /** Authenticated requester, regardless of their company role; deletion preserves history. */
    requesterId: text('requester_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Stable absence category: day_off, vacation, or sick_leave. */
    kind: text('kind').$type<'day_off' | 'vacation' | 'sick_leave'>().notNull(),
    /** First requested company calendar date, inclusive, without a timezone conversion. */
    startDate: date('start_date').notNull(),
    /** Last requested company calendar date, inclusive; null only for an open sick-leave period. */
    endDate: date('end_date'),
    /** Requester's optional explanation, never authentication information. */
    note: text('note').notNull().default(''),
    /** Pending requests may be reviewed or cancelled before review; approved, rejected, and cancelled requests are final. */
    status: text('status')
      .$type<'pending' | 'approved' | 'rejected' | 'cancelled'>()
      .notNull()
      .default('pending'),
    /** Optimistic revision prevents overwriting another reviewer's changes. */
    revision: integer('revision').notNull().default(0),
    /** Account responsible for the latest review, null before review. */
    reviewerId: text('reviewer_id').references(() => user.id, {
      onDelete: 'restrict',
    }),
    /** Optional latest review description; empty when omitted or before the first review. */
    reviewReason: text('review_reason').notNull().default(''),
    /** UTC instant of the latest review, null until review. */
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    /** Paid working days debited on approval; retained so schedule changes never recalculate historical charges. Zero for day offs and unapproved requests. */
    chargedVacationDays: integer('charged_vacation_days').notNull().default(0),
    ...timestamps(),
  },
  (table) => [
    index('leave_request_own_created').on(
      table.requesterId,
      table.createdAt,
      table.id,
    ),
    index('leave_request_status_created').on(
      table.status,
      table.createdAt,
      table.id,
    ),
    check(
      'leave_request_dates_valid',
      sql`(${table.kind} = 'sick_leave' and (${table.endDate} is null or ${table.endDate} >= ${table.startDate})) or (${table.kind} <> 'sick_leave' and ${table.endDate} is not null and ${table.endDate} >= ${table.startDate} and ${table.endDate} - ${table.startDate} <= 365)`,
    ),
    check(
      'leave_request_kind_valid',
      sql`${table.kind} in ('day_off', 'vacation', 'sick_leave')`,
    ),
    check(
      'leave_request_status_valid',
      sql`${table.status} in ('pending', 'approved', 'rejected', 'cancelled')`,
    ),
    check(
      'leave_request_charge_valid',
      sql`${table.chargedVacationDays} between 0 and 366 and (${table.chargedVacationDays} = 0 or (${table.kind} = 'vacation' and ${table.status} = 'approved'))`,
    ),
    check('leave_request_revision_valid', sql`${table.revision} >= 0`),
    check('leave_request_note_valid', sql`length(${table.note}) <= 500`),
    check(
      'leave_request_review_valid',
      sql`(${table.reviewerId} is null and ${table.reviewedAt} is null and ${table.reviewReason} = '' and ${table.status} in ('pending', 'cancelled')) or (${table.reviewerId} is not null and ${table.reviewerId} <> ${table.requesterId} and ${table.reviewedAt} is not null and ${table.status} <> 'cancelled' and length(${table.reviewReason}) <= 500)`,
    ),
  ],
)

/** Append-only request history. Creation, date changes, and decisions commit with their minimal before/after facts. */
export const leaveAudit = pgTable(
  'leave_audit',
  {
    /** Database-generated history identity. */
    id: uuidv7PrimaryKey(),
    /** Request retained alongside its history. */
    requestId: uuid('request_id')
      .notNull()
      .references(() => leaveRequest.id, { onDelete: 'restrict' }),
    /** Account authorizing this action. */
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Stable created, modified, approved, rejected, cancelled, or closed operation. */
    action: text('action').notNull(),
    /** Optional reviewer description or a fixed creation/cancellation explanation. */
    reason: text('reason').notNull(),
    /** Minimal prior request facts; null for creation. */
    before: jsonb('before'),
    /** Minimal resulting request facts. */
    after: jsonb('after').notNull(),
    /** Authoritative UTC audit instant. */
    createdAt: createdAt(),
  },
  (table) => [
    index('leave_audit_request').on(table.requestId, table.createdAt),
  ],
)
