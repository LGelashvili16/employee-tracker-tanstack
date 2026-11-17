import { z } from 'zod'

export const accountDirectorySearchSchema = z.object({
  q: z
    .string({ error: 'ძიება არასწორია.' })
    .trim()
    .max(100, 'ძიება მაქსიმუმ 100 სიმბოლოს უნდა შეიცავდეს.')
    .optional(),
  state: z
    .enum(['all', 'active', 'invited', 'suspended'], {
      error: 'სტატუსი არასწორია.',
    })
    .optional(),
  sort: z
    .enum(
      [
        'name-asc',
        'name-desc',
        'username-asc',
        'username-desc',
        'code-asc',
        'code-desc',
      ],
      { error: 'დალაგება არასწორია.' },
    )
    .optional(),
  page: z
    .number({ error: 'გვერდი არასწორია.' })
    .int('გვერდი არასწორია.')
    .min(1, 'გვერდი არასწორია.')
    .max(100000, 'გვერდი არასწორია.')
    .optional(),
})
export const accountDirectoryQuerySchema = z.object({
  q: accountDirectorySearchSchema.shape.q.unwrap(),
  state: accountDirectorySearchSchema.shape.state.unwrap(),
})
export type AccountDirectorySearch = z.infer<
  typeof accountDirectorySearchSchema
>
