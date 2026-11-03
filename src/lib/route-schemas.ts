import { z } from 'zod'

export const recordIdSchema = z
  .string()
  .min(1, 'ჩანაწერის იდენტიფიკატორი აუცილებელია.')
  .max(128, 'იდენტიფიკატორი ძალიან გრძელია.')
  .regex(/^[a-zA-Z0-9_-]+$/, 'იდენტიფიკატორი არასწორია.')
export const authLinkSearchSchema = z.object({
  token: z
    .string()
    .min(1, 'ბმული არასწორია.')
    .max(512, 'ბმული არასწორია.')
    .optional(),
  error: z.string().max(128, 'ბმული არასწორია.').optional(),
})
