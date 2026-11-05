import { z } from 'zod'
import { accountPasswordSchema } from '#/features/access/access.schemas'

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'მიუთითეთ მიმდინარე პაროლი.'),
    newPassword: accountPasswordSchema,
    confirmPassword: z.string().min(1, 'გაიმეორეთ ახალი პაროლი.'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'პაროლები ერთმანეთს არ ემთხვევა.',
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'ახალი პაროლი უნდა განსხვავდებოდეს მიმდინარე პაროლისგან.',
  })
