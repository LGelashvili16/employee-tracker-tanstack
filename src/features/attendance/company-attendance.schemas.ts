import { z } from 'zod'
import { recordIdSchema } from '#/lib/route-schemas'

const page = z
  .number({ error: 'გვერდი არასწორია.' })
  .int('გვერდი არასწორია.')
  .min(1, 'გვერდი არასწორია.')
  .max(100000, 'გვერდი არასწორია.')
export const companyAttendanceSearchSchema = z.object({
  page: page.optional(),
  q: z
    .string({ error: 'ძიება არასწორია.' })
    .trim()
    .max(100, 'ძიება მაქსიმუმ 100 სიმბოლოს უნდა შეიცავდეს.')
    .optional(),
  sort: z
    .enum(['name-asc', 'name-desc', 'code-asc', 'code-desc'], {
      error: 'დალაგება არასწორია.',
    })
    .optional(),
  // Preserve old filtered links by redirecting them to the employee detail route.
  userId: recordIdSchema.optional(),
})
export const companyAttendanceListSchema = companyAttendanceSearchSchema
  .omit({ userId: true })
  .extend({
    page: page.default(1),
    q: companyAttendanceSearchSchema.shape.q.default(''),
    sort: companyAttendanceSearchSchema.shape.sort.default('name-asc'),
  })
export const companyAttendanceUserSearchSchema = z.object({
  page: page.optional(),
  sort: z
    .enum(['date-desc', 'date-asc'], { error: 'დალაგება არასწორია.' })
    .optional(),
})
export const companyAttendanceUserSchema =
  companyAttendanceUserSearchSchema.extend({
    userId: recordIdSchema,
    page: page.default(1),
    sort: companyAttendanceUserSearchSchema.shape.sort.default('date-desc'),
  })
export const companyAttendanceQuerySchema = z.object({
  q: companyAttendanceSearchSchema.shape.q.unwrap(),
})
