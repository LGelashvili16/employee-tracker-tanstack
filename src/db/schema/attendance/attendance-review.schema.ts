import { sql } from 'drizzle-orm'
import {
  check,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
  index,
} from 'drizzle-orm/pg-core'
import { createdAt, uuidv7PrimaryKey } from '../_shared/columns'
import { user } from '../auth/auth.schema'
import { employee } from '../employees/employee.schema'

/** Explicit attendance scope until broader team membership is implemented. No role grants company-wide access. */
export const attendanceReviewer = pgTable(
  'attendance_reviewer',
  {
    /** Trusted reviewer account, independently checked for current permissions. */
    reviewerId: text('reviewer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Employee whose attendance may be reviewed. */
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employee.id, { onDelete: 'restrict' }),
    /** Creation instant for the explicit assignment. */
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.reviewerId, table.employeeId] })],
)

/** Single-company attendance warning configuration, separate from effective-dated schedules. */
export const attendanceSetting = pgTable(
  'attendance_setting',
  {
    /** Fixed singleton identifier. */
    id: integer('id').primaryKey().default(1),
    /** Maximum open-session hours before review is requested, not an automatic cutoff. */
    maxOpenHours: integer('max_open_hours').notNull().default(16),
    /** Version used to reject stale settings writes. */
    revision: integer('revision').notNull().default(0),
  },
  (table) => [
    check(
      'attendance_setting_valid',
      sql`${table.id} = 1 and ${table.maxOpenHours} between 8 and 72 and ${table.revision} >= 0`,
    ),
  ],
)

/** Append-only workflow audit. Before/after values contain attendance facts, never authentication records. */
export const attendanceAudit = pgTable(
  'attendance_audit',
  {
    /** Database-generated immutable audit identity. */
    id: uuidv7PrimaryKey(),
    /** Authenticated account authorizing the change. */
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Session, employee assignment, or singleton setting identifier. */
    targetId: text('target_id').notNull(),
    /** Stable attendance operation identifier. */
    action: text('action').notNull(),
    /** Required explanation for manager and configuration actions. */
    reason: text('reason').notNull(),
    /** Minimal state immediately before the write. */
    before: jsonb('before').notNull(),
    /** Minimal state immediately after the write. */
    after: jsonb('after').notNull(),
    /** Authoritative database audit timestamp. */
    createdAt: createdAt(),
  },
  (table) => [
    index('attendance_audit_target').on(table.targetId, table.createdAt),
    check(
      'attendance_audit_reason_valid',
      sql`length(trim(${table.reason})) between 5 and 500`,
    ),
  ],
)
