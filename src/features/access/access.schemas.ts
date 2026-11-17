import { z } from 'zod'
import { employeeRoleSchema } from '#/lib/authorization/permissions'
import { employeeWorkingWeekSchema } from '#/features/scheduling/scheduling.schemas'
import { dayOffDaysSchema } from '#/features/leave/day-off-allowance.schemas'
import {
  maxPasswordLength,
  minPasswordLength,
  normalizeSetupCode,
  setupCodeAlphabet,
  setupCodeLength,
} from './access.rules'

export { employeeRoleSchema }

export const employeeCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'მომხმარებლის სახელი უნდა შეიცავდეს მინიმუმ 3 სიმბოლოს.')
  .max(32, 'მომხმარებლის სახელი ძალიან გრძელია.')
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/,
    'გამოიყენეთ ლათინური ასოები, ციფრები, წერტილი, დეფისი ან ქვედა ტირე.',
  )
export const reasonSchema = z
  .string()
  .trim()
  .min(5, 'მიუთითეთ მოქმედების მიზეზი, მინიმუმ 5 სიმბოლო.')
  .max(500, 'მიზეზი ძალიან გრძელია.')
export const accountIdSchema = z
  .string()
  .min(1, 'ანგარიში არასწორია.')
  .max(128, 'ანგარიში არასწორია.')
export const accountLookupSchema = z.object({ userId: accountIdSchema })
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'მიუთითეთ სახელი და გვარი.')
  .max(100, 'სახელი ძალიან გრძელია.')
export const contactEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z.union([
      z.literal(''),
      z.email('ელფოსტა არასწორია.').max(254, 'ელფოსტა ძალიან გრძელია.'),
    ]),
  )
export const jobTitleSchema = z
  .string()
  .trim()
  .max(100, 'თანამდებობა ძალიან გრძელია.')
  .default('')
export const phoneSchema = z
  .string()
  .trim()
  .max(32, 'ტელეფონის ნომერი ძალიან გრძელია.')
  .refine(
    (value) => value === '' || /^\+?[0-9][0-9 ()-]{5,30}[0-9]$/.test(value),
    'მიუთითეთ სწორი ტელეფონის ნომერი.',
  )
  .default('')
export const provisionAccountSchema = z.object({
  code: employeeCodeSchema,
  name: fullNameSchema,
  contactEmail: contactEmailSchema,
  jobTitle: jobTitleSchema,
  phone: phoneSchema,
  workingWeek: employeeWorkingWeekSchema.nullable().default(null),
  dayOffAllowance: dayOffDaysSchema.nullable().default(null),
  role: employeeRoleSchema,
})
/** Administrative correction of an existing employee's personal details; username and role stay fixed. */
export const employeeDetailsSchema = z.object({
  userId: accountIdSchema,
  name: fullNameSchema,
  contactEmail: contactEmailSchema,
  jobTitle: jobTitleSchema,
  phone: phoneSchema,
  /** Omitted leaves the schedule untouched, null returns to the company schedule, an array assigns a custom week. */
  workingWeek: employeeWorkingWeekSchema.nullable().optional(),
})
/** The only field employees may change themselves; everything else is administrator-controlled. */
export const ownPhoneSchema = z.object({ phone: phoneSchema })
export const accountActionSchema = z.object({
  userId: accountIdSchema,
  action: z.enum(['issue_activation', 'issue_reset', 'suspend', 'restore'], {
    error: 'მოქმედება არასწორია.',
  }),
  reason: reasonSchema,
})
export const ownerRecoverySchema = z.object({
  code: employeeCodeSchema,
  reason: reasonSchema,
})
export const accountListSchema = z.object({
  page: z
    .number()
    .int('გვერდი არასწორია.')
    .min(1, 'გვერდი არასწორია.')
    .max(10000, 'გვერდი არასწორია.'),
})
export const accountSearchSchema = z.object({
  page: z.coerce
    .number()
    .int('გვერდი არასწორია.')
    .min(1, 'გვერდი არასწორია.')
    .max(10000, 'გვერდი არასწორია.')
    .default(1),
})
export const accountPasswordSchema = z
  .string()
  .min(
    minPasswordLength,
    `პაროლი უნდა შეიცავდეს მინიმუმ ${minPasswordLength} სიმბოლოს.`,
  )
  .max(maxPasswordLength, 'პაროლი ძალიან გრძელია.')
export const accountCodeSchema = z
  .string()
  .transform(normalizeSetupCode)
  .pipe(
    z
      .string()
      .regex(
        new RegExp(`^[${setupCodeAlphabet}]{${setupCodeLength}}$`),
        'მიუთითეთ ადმინისტრატორისგან მიღებული ერთჯერადი კოდი.',
      ),
  )
export const completeAccountSchema = z.object({
  code: accountCodeSchema,
  newPassword: accountPasswordSchema,
})
export const accountSetupFormSchema = completeAccountSchema
  .extend({ confirmPassword: z.string().min(1, 'გაიმეორეთ პაროლი.') })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'პაროლები ერთმანეთს არ ემთხვევა.',
  })
