import { z } from 'zod'
import { accountDirectorySearchSchema } from '#/lib/account-directory.schemas'
import { recordIdSchema } from '#/lib/route-schemas'
import { employeeTimesheetSearchSchema } from '#/features/timesheets/timesheets.schemas'
import { scheduleDateSchema } from '#/features/scheduling/scheduling.schemas'

const page = z
  .number({ error: 'გვერდი არასწორია.' })
  .int('გვერდი არასწორია.')
  .min(1, 'გვერდი არასწორია.')
  .max(100000, 'გვერდი არასწორია.')
export const companyAttendanceSearchSchema =
  accountDirectorySearchSchema.extend({
    userId: recordIdSchema.optional(),
  })
export const companyAttendanceListSchema = companyAttendanceSearchSchema
  .omit({ userId: true })
  .extend({
    page: page.default(1),
    q: companyAttendanceSearchSchema.shape.q.default(''),
    sort: companyAttendanceSearchSchema.shape.sort.default('name-asc'),
  })
export const attendanceDaySchema = scheduleDateSchema.refine(
  (value) => value >= '2000-01-01' && value <= '2100-12-31',
  'თარიღი დასაშვებ დიაპაზონს სცდება.',
)
export const attendanceDayFormSchema = z.object({ date: attendanceDaySchema })
const attendanceHistorySearchSchema = z.object({
  date: attendanceDaySchema.optional(),
})
export const companyAttendanceUserSearchSchema =
  attendanceHistorySearchSchema.extend(employeeTimesheetSearchSchema.shape)
export const companyAttendanceUserSchema = attendanceHistorySearchSchema.extend(
  {
    userId: recordIdSchema,
    period: z
      .enum(['day', 'week'], { error: 'აირჩიეთ დასაშვები პერიოდი.' })
      .optional(),
  },
)
export const companyAttendanceQuerySchema = z.object({
  q: companyAttendanceSearchSchema.shape.q.unwrap(),
  state: companyAttendanceSearchSchema.shape.state.unwrap(),
})
