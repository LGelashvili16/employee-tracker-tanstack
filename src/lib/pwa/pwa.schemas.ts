import { z } from 'zod'

export const workerMessageSchema = z.object({
  type: z.literal('SKIP_WAITING', { error: 'განახლების მოთხოვნა არასწორია.' }),
})
