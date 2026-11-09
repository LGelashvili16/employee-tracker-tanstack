import { z } from 'zod'
import { recordIdSchema } from '#/lib/route-schemas'

export const timesheetMonthSchema = z
  .string({ error: 'თვე არასწორია.' })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'თვე არასწორია.')
  .refine(
    (value) => value >= '2000-01' && value <= '2100-12',
    'თვე დასაშვებ დიაპაზონს სცდება.',
  )
export const timesheetSearchSchema = z.object({
  q: z
    .string({ error: 'ძიება არასწორია.' })
    .trim()
    .max(100, 'ძიება მაქსიმუმ 100 სიმბოლოს უნდა შეიცავდეს.')
    .optional(),
  status: z
    .enum(['all', 'open', 'pending', 'rejected', 'approved'], {
      error: 'სტატუსი არასწორია.',
    })
    .optional(),
  sort: z
    .enum(
      [
        'date-desc',
        'date-asc',
        'name-asc',
        'name-desc',
        'seconds-desc',
        'seconds-asc',
      ],
      { error: 'დალაგება არასწორია.' },
    )
    .optional(),
  month: timesheetMonthSchema.optional(),
  userId: recordIdSchema.optional(),
  page: z
    .number({ error: 'გვერდი არასწორია.' })
    .int('გვერდი არასწორია.')
    .min(0, 'გვერდი არასწორია.')
    .max(10000, 'გვერდი არასწორია.')
    .optional(),
})
export const timesheetRequestSchema = timesheetSearchSchema.extend({
  month: timesheetMonthSchema.optional(),
  page: timesheetSearchSchema.shape.page.default(0),
})
export const timesheetFiltersSchema = z.object({
  q: timesheetSearchSchema.shape.q.unwrap(),
  status: timesheetSearchSchema.shape.status.unwrap(),
})

export const employeeTimesheetSearchSchema = z.object({
  view: z
    .enum(['attendance', 'timesheet'], { error: 'განყოფილება არასწორია.' })
    .optional(),
  month: timesheetMonthSchema.optional(),
  hoursPage: timesheetSearchSchema.shape.page,
  hoursSort: timesheetSearchSchema.shape.sort,
  hoursStatus: timesheetSearchSchema.shape.status,
})

/** Keep timesheet controls independent from the attendance history's page and sort. */
export function employeeTimesheetSearch(
  search: z.infer<typeof timesheetSearchSchema>,
) {
  return employeeTimesheetSearchSchema.parse({
    view: 'timesheet',
    month: search.month,
    hoursPage: search.page,
    hoursSort: search.sort,
    hoursStatus: search.status,
  })
}
