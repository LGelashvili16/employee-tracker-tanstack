import { z } from 'zod'

export const announcementIdSchema = z.uuid(
  'განცხადების იდენტიფიკატორი არასწორია.',
)
export const announcementSearchSchema = z.object(
  {
    page: z.coerce
      .number({ error: 'გვერდი არასწორია.' })
      .int('გვერდი არასწორია.')
      .min(1, 'გვერდი არასწორია.')
      .max(10000, 'გვერდი არასწორია.')
      .default(1),
    q: z
      .string({ error: 'საძიებო ტექსტი არასწორია.' })
      .trim()
      .max(100, 'საძიებო ტექსტი ძალიან გრძელია.')
      .default(''),
    sort: z
      .enum(['newest', 'oldest'], { error: 'დალაგება არასწორია.' })
      .default('newest'),
    status: z
      .enum(['all', 'unread', 'read'], { error: 'სტატუსი არასწორია.' })
      .default('all'),
    announcementId: announcementIdSchema.optional(),
  },
  { error: 'ძიების მონაცემები არასწორია.' },
)
export const publishAnnouncementSchema = z.object(
  {
    requestId: z.uuid('მოთხოვნის იდენტიფიკატორი არასწორია.'),
    title: z
      .string({ error: 'მიუთითეთ სათაური.' })
      .trim()
      .min(1, 'მიუთითეთ სათაური.')
      .max(160, 'სათაური მაქსიმუმ 160 სიმბოლოს უნდა შეიცავდეს.'),
    body: z
      .string({ error: 'მიუთითეთ განცხადების ტექსტი.' })
      .trim()
      .min(1, 'მიუთითეთ განცხადების ტექსტი.')
      .max(10000, 'ტექსტი მაქსიმუმ 10000 სიმბოლოს უნდა შეიცავდეს.'),
    showOnLogin: z.boolean({ error: 'აირჩიეთ ჩვენების წესი.' }),
  },
  { error: 'განცხადების მონაცემები არასწორია.' },
)
export const announcementFormSchema = publishAnnouncementSchema.omit({
  requestId: true,
})
export const announcementFilterSchema = z.object({
  q: announcementSearchSchema.shape.q.removeDefault(),
})
export const announcementLookupSchema = z.object(
  { id: announcementIdSchema },
  { error: 'განცხადების მონაცემები არასწორია.' },
)
export const acknowledgeAnnouncementSchema = announcementLookupSchema.extend({
  action: z.enum(['dismiss', 'read'], { error: 'მოქმედება არასწორია.' }),
})
export type AnnouncementSearch = z.infer<typeof announcementSearchSchema>
