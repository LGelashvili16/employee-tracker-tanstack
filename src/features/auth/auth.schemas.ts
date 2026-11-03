import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('მიუთითეთ სწორი ელფოსტა.').max(254, 'ელფოსტა ძალიან გრძელია.'),
  password: z
    .string()
    .min(1, 'მიუთითეთ პაროლი.')
    .max(128, 'პაროლი ძალიან გრძელია.'),
})
