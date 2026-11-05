import { sql } from 'drizzle-orm'
import { check, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { employee } from '../employees/employee.schema'
import { user } from '../auth/auth.schema'
import { createdAt } from '../_shared/columns'
import type { z } from 'zod'
import type { employeeWorkingWeekSchema } from '#/features/scheduling/scheduling.schemas'

/** Initial recurring assignment. Absence means company defaults; attendance snapshots retain past expectations. */
export const employeeWorkSchedule = pgTable(
  'employee_work_schedule',
  {
    employeeId: uuid('employee_id')
      .primaryKey()
      .references(() => employee.id, { onDelete: 'restrict' }),
    days: jsonb('days')
      .$type<z.infer<typeof employeeWorkingWeekSchema>>()
      .notNull(),
    assignedBy: text('assigned_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      'employee_work_schedule_week_valid',
      sql`jsonb_typeof(${table.days}) = 'array' and jsonb_array_length(${table.days}) = 7`,
    ),
  ],
)
