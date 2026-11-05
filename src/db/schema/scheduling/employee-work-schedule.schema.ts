import { sql } from 'drizzle-orm'
import { check, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { employee } from '../employees/employee.schema'
import { user } from '../auth/auth.schema'
import { createdAt } from '../_shared/columns'
import type { z } from 'zod'
import type { employeeWorkingWeekSchema } from '#/features/scheduling/scheduling.schemas'

/** Current recurring assignment; absence means company defaults. Replacing it rewrites the row, and the access audit keeps the history and reason. Attendance snapshots retain past expectations. */
export const employeeWorkSchedule = pgTable(
  'employee_work_schedule',
  {
    /** Employee this week belongs to; the primary key allows at most one custom week per employee. */
    employeeId: uuid('employee_id')
      .primaryKey()
      .references(() => employee.id, { onDelete: 'restrict' }),
    /** Seven entries, one per ISO weekday (1 = Monday); hours are company-local start and end times, or null for a day off. */
    days: jsonb('days')
      .$type<z.infer<typeof employeeWorkingWeekSchema>>()
      .notNull(),
    /** Administrator who made the current assignment. */
    assignedBy: text('assigned_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** UTC instant the current assignment was made; rewritten when the week is replaced. */
    createdAt: createdAt(),
  },
  (table) => [
    check(
      'employee_work_schedule_week_valid',
      sql`jsonb_typeof(${table.days}) = 'array' and jsonb_array_length(${table.days}) = 7`,
    ),
  ],
)
