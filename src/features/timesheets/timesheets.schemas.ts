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
