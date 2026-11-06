import { z } from 'zod'
import { recordIdSchema } from '#/lib/route-schemas'

export const attendanceSearchSchema = z.object({
  userId: recordIdSchema.optional(),
})

const identifier = z.uuid({ error: 'ჩანაწერის იდენტიფიკატორი არასწორია.' })
export const checkInSchema = z.object(
  {
    requestId: identifier,
    expectedLastSessionId: identifier.nullable(),
  },
  { error: 'შესვლის მოთხოვნა არასწორია.' },
)
export const checkOutSchema = z.object(
  {
    sessionId: identifier,
    confirmEarly: z.boolean({
      error: 'დაადასტურეთ სამუშაო დღის ადრე დასრულება.',
    }),
  },
  { error: 'გასვლის მოთხოვნა არასწორია.' },
)

const reason = z
  .string({ error: 'მიუთითეთ მიზეზი.' })
  .trim()
  .min(5, 'მიზეზი უნდა შეიცავდეს სულ მცირე 5 სიმბოლოს.')
  .max(500, 'მიზეზი არ უნდა აღემატებოდეს 500 სიმბოლოს.')
const revision = z
  .number({ error: 'ჩანაწერის ვერსია არასწორია.' })
  .int('ვერსია უნდა იყოს მთელი რიცხვი.')
  .min(0, 'ვერსია არასწორია.')
const localTime = z
  .string({ error: 'მიუთითეთ თარიღი და დრო.' })
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'თარიღი და დრო არასწორია.')
  .refine((value) => {
    const parsed = new Date(`${value}:00Z`)
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 16) === value
    )
  }, 'თარიღი და დრო არასწორია.')
export const attendanceReviewSchema = z.object({
  sessionId: identifier,
  revision,
  reason,
  decision: z.enum(['approve', 'reject'], { error: 'აირჩიეთ გადაწყვეტილება.' }),
  approveOutside: z.boolean({ error: 'მიუთითეთ დამატებითი დროის დამტკიცება.' }),
})
export const attendanceCorrectionSchema = z
  .object({
    sessionId: identifier,
    revision,
    reason,
    start: localTime,
    end: localTime,
  })
  .refine((value) => value.end > value.start, {
    path: ['end'],
    message: 'დასრულება უნდა იყოს დაწყების შემდეგ.',
  })
export const attendanceListSchema = z.object({
  userId: recordIdSchema.optional(),
  page: z
    .number({ error: 'გვერდი არასწორია.' })
    .int('გვერდი არასწორია.')
    .min(0, 'გვერდი არასწორია.')
    .max(10000, 'გვერდი არასწორია.'),
  exceptionsOnly: z.boolean({ error: 'ფილტრი არასწორია.' }).default(false),
})
export const attendanceHistorySchema = z.object({ sessionId: identifier })
export const attendanceLimitSchema = z.object({
  maxOpenHours: z
    .number({ error: 'მიუთითეთ საათების რაოდენობა.' })
    .int('მიუთითეთ მთელი საათები.')
    .min(8, 'მინიმუმ 8 საათი.')
    .max(72, 'მაქსიმუმ 72 საათი.'),
  revision,
  reason,
})
export const attendanceAssignmentSchema = z.object({
  employeeId: identifier,
  reviewerId: z
    .string({ error: 'აირჩიეთ ხელმძღვანელი.' })
    .min(1, 'აირჩიეთ ხელმძღვანელი.')
    .max(128, 'იდენტიფიკატორი არასწორია.'),
  revoke: z.boolean({ error: 'არჩევანი არასწორია.' }),
  reason,
})
