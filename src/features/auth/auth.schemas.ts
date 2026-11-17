import { z } from 'zod'
import { employeeCodeSchema } from '#/features/access/access.schemas'

export const loginSchema = z.object({
  identifier: z
    .string({ error: 'მიუთითეთ მომხმარებლის სახელი.' })
    .trim()
    .min(1, 'მიუთითეთ მომხმარებლის სახელი.')
    .max(254, 'მომხმარებლის სახელი ძალიან გრძელია.')
    .refine(
      (value) =>
        employeeCodeSchema.safeParse(value).success ||
        z.email().safeParse(value).success,
      'მიუთითეთ მომხმარებლის სახელი ან ელფოსტა.',
    ),
  password: z
    .string()
    .min(1, 'მიუთითეთ პაროლი.')
    .max(128, 'პაროლი ძალიან გრძელია.'),
})
