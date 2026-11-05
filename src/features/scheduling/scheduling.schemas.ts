import { z } from 'zod'

export const scheduleDateSchema = z.iso.date({
  error: 'მიუთითეთ სწორი თარიღი.',
})

export const scheduleTimezoneSchema = z
  .string({ error: 'მიუთითეთ დროის სარტყელი.' })
  .max(100, 'დროის სარტყელი ძალიან გრძელია.')
  .refine((value) => {
    // Reject numeric offsets: recurring schedules need named timezone rules.
    if (value !== 'UTC' && !value.includes('/')) return false
    try {
      new Intl.DateTimeFormat('ka-GE', { timeZone: value }).format(0)
      return true
    } catch {
      return false
    }
  }, 'მიუთითეთ მოქმედი დროის სარტყელი, მაგალითად Asia/Tbilisi.')

const localTimeSchema = z
  .string({ error: 'მიუთითეთ სამუშაო დრო.' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'დრო მიუთითეთ საათისა და წუთის ფორმატით.')

export const scheduleWeekdaySchema = z.object(
  {
    weekday: z
      .number({ error: 'მიუთითეთ კვირის დღე.' })
      .int('კვირის დღე არასწორია.')
      .min(1, 'კვირის დღე არასწორია.')
      .max(7, 'კვირის დღე არასწორია.'),
    hours: z
      .object(
        { start: localTimeSchema, end: localTimeSchema },
        { error: 'მიუთითეთ დაწყებისა და დასრულების დრო.' },
      )
      .refine((hours) => hours.end > hours.start, {
        path: ['end'],
        message: 'დასრულების დრო დაწყების დროზე გვიან უნდა იყოს.',
      })
      .nullable(),
  },
  { error: 'მიუთითეთ კვირის დღის განრიგი.' },
)

const boundedMinutes = (label: string) =>
  z.number({ error: label }).int(label).min(0, label).max(60, label)

/** Complete company default week; effective-date authorization belongs to the service. */
export const companyScheduleSchema = z
  .object(
    {
      effectiveFrom: scheduleDateSchema,
      timezone: scheduleTimezoneSchema,
      lateGraceMinutes: boundedMinutes(
        'დაგვიანების შეღავათი უნდა იყოს 0-დან 60 წუთამდე.',
      ),
      earlyDepartureGraceMinutes: boundedMinutes(
        'ადრე გასვლის შეღავათი უნდა იყოს 0-დან 60 წუთამდე.',
      ),
      reminderMinutesBefore: boundedMinutes(
        'შეხსენების დრო უნდა იყოს 0-დან 60 წუთამდე.',
      ).default(5),
      checkoutReminderMinutesBefore: boundedMinutes(
        'გასვლის შეხსენების დრო უნდა იყოს 0-დან 60 წუთამდე.',
      ).default(0),
      days: z
        .array(scheduleWeekdaySchema, {
          error: 'მიუთითეთ კვირის სამუშაო განრიგი.',
        })
        .length(7, 'მიუთითეთ კვირის შვიდივე დღე.'),
    },
    { error: 'მიუთითეთ კომპანიის სამუშაო განრიგი.' },
  )
  .superRefine((value, context) => {
    if (new Set(value.days.map((day) => day.weekday)).size !== 7) {
      context.addIssue({
        code: 'custom',
        path: ['days'],
        message: 'კვირის თითოეული დღე მიუთითეთ მხოლოდ ერთხელ.',
      })
    }
    if (!value.days.some((day) => day.hours !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['days'],
        message: 'მიუთითეთ მინიმუმ ერთი სამუშაო დღე.',
      })
    }
  })

export type CompanyScheduleInput = z.input<typeof companyScheduleSchema>
export type CompanySchedule = z.output<typeof companyScheduleSchema>

// Retain past versions' tolerances, but new schedules never allow a grace period.
export const saveCompanyScheduleSchema = companyScheduleSchema.safeExtend({
  lateGraceMinutes: z.literal(0, {
    error: 'დაგვიანების შეღავათი არ გამოიყენება.',
  }),
  earlyDepartureGraceMinutes: z.literal(0, {
    error: 'ადრე გასვლის შეღავათი არ გამოიყენება.',
  }),
})
export type SaveCompanyScheduleInput = z.input<typeof saveCompanyScheduleSchema>
