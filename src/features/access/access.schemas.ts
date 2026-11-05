import { z } from 'zod'
import { employeeWorkingWeekSchema } from '#/features/scheduling/scheduling.schemas'

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
export const employeeRoleSchema = z.enum(
  ['employee', 'supervisor', 'operations_manager', 'hr_manager'],
  { error: 'თანამშრომლის როლი არასწორია.' },
)
export const reasonSchema = z
  .string()
  .trim()
  .min(5, 'მიუთითეთ მოქმედების მიზეზი, მინიმუმ 5 სიმბოლო.')
  .max(500, 'მიზეზი ძალიან გრძელია.')
export const provisionAccountSchema = z.object({
  code: employeeCodeSchema,
  name: z
    .string()
    .trim()
    .min(2, 'მიუთითეთ სახელი და გვარი.')
    .max(100, 'სახელი ძალიან გრძელია.'),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(
      z.union([
        z.literal(''),
        z.email('ელფოსტა არასწორია.').max(254, 'ელფოსტა ძალიან გრძელია.'),
      ]),
    ),
  jobTitle: z
    .string()
    .trim()
    .max(100, 'თანამდებობა ძალიან გრძელია.')
    .default(''),
  phone: z
    .string()
    .trim()
    .max(32, 'ტელეფონის ნომერი ძალიან გრძელია.')
    .refine(
      (value) => value === '' || /^\+?[0-9][0-9 ()-]{5,30}[0-9]$/.test(value),
      'მიუთითეთ სწორი ტელეფონის ნომერი.',
    )
    .default(''),
  workingWeek: employeeWorkingWeekSchema.nullable().default(null),
  role: employeeRoleSchema,
})
export const accountActionSchema = z.object({
  userId: z
    .string()
    .min(1, 'ანგარიში არასწორია.')
    .max(128, 'ანგარიში არასწორია.'),
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
  .min(12, 'პაროლი უნდა შეიცავდეს მინიმუმ 12 სიმბოლოს.')
  .max(128, 'პაროლი ძალიან გრძელია.')
export const accountCodeSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9_-]{43}$/,
    'მიუთითეთ ადმინისტრატორისგან მიღებული ერთჯერადი კოდი.',
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
