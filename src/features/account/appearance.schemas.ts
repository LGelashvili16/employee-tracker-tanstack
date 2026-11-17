import { z } from 'zod'
import { accentIds } from '#/lib/appearance'

export const accentIdSchema = z
  .string()
  .refine((id) => accentIds.includes(id), {
    message: 'აირჩიეთ ხელმისაწვდომი ფერი.',
  })

export const appearanceSchema = z.object({ accent: accentIdSchema })
