import { z } from 'zod'

const text = (max: number) =>
  z
    .string({ error: 'მიუთითეთ ტექსტი.' })
    .trim()
    .min(1, 'შეავსეთ ველი.')
    .max(max, `მაქსიმუმ ${max} სიმბოლო.`)
export const complaintIdSchema = z.uuid({ error: 'საჩივრის ნომერი არასწორია.' })
export const complaintStatusSchema = z.enum(
  ['new', 'in_review', 'resolved', 'closed'],
  { error: 'სტატუსი არასწორია.' },
)
export const complaintVisibilitySchema = z.enum(['standard', 'hr_only'], {
  error: 'ხილვადობა არასწორია.',
})
export const complaintCategorySchema = z.enum(
  ['conditions', 'equipment', 'conduct', 'other'],
  { error: 'კატეგორია არასწორია.' },
)
export const createComplaintSchema = z
  .object({
    submissionId: complaintIdSchema,
    title: text(160),
    description: text(5000),
    category: complaintCategorySchema,
  })
  .strict()
export const complaintFilterSchema = z.object({
  q: z
    .string({ error: 'ძიება არასწორია.' })
    .trim()
    .max(100, 'მაქსიმუმ 100 სიმბოლო.'),
  status: z.enum(['all', ...complaintStatusSchema.options], {
    error: 'სტატუსი არასწორია.',
  }),
  sort: z.enum(['newest', 'oldest'], { error: 'დალაგება არასწორია.' }),
})
const page = z.coerce
  .number({ error: 'გვერდი არასწორია.' })
  .int('გვერდი არასწორია.')
  .min(1, 'გვერდი არასწორია.')
  .max(100000, 'გვერდი არასწორია.')
  .optional()
export const complaintSearchSchema = complaintFilterSchema.partial().extend({
  page,
  complaintId: complaintIdSchema.optional(),
  activityPage: page,
})
export const complaintListSchema = complaintSearchSchema.extend({
  review: z.boolean({ error: 'მოთხოვნა არასწორია.' }),
})
export const complaintDetailSchema = z.object({ id: complaintIdSchema, page })
const revision = z
  .number({ error: 'ვერსია არასწორია.' })
  .int('ვერსია არასწორია.')
  .nonnegative('ვერსია არასწორია.')
export const complaintReplySchema = z
  .object({
    id: complaintIdSchema,
    submissionId: complaintIdSchema,
    body: text(5000),
  })
  .strict()
export const complaintStatusChangeSchema = z
  .object({
    id: complaintIdSchema,
    revision,
    status: complaintStatusSchema,
    reason: text(2000),
  })
  .strict()
export const complaintAssignSchema = z
  .object({
    id: complaintIdSchema,
    revision,
    assigneeId: z
      .string({ error: 'აირჩიეთ პასუხისმგებელი.' })
      .min(1, 'აირჩიეთ პასუხისმგებელი.')
      .max(256, 'მნიშვნელობა არასწორია.'),
    reason: text(2000),
  })
  .strict()
export const complaintReviewersSchema = z.object({
  id: complaintIdSchema,
  q: z.string().trim().max(100, 'მაქსიმუმ 100 სიმბოლო.'),
})
export const complaintRealtimeSchema = z.object({
  changed: z.boolean(),
  hasUnreadComplaints: z.boolean().optional().default(false),
  id: complaintIdSchema.optional(),
  notification: z.object({ id: z.uuid(), review: z.boolean() }).optional(),
})
export type ComplaintSearch = z.infer<typeof complaintSearchSchema>
export type ComplaintStatus = z.infer<typeof complaintStatusSchema>
export type ComplaintVisibility = z.infer<typeof complaintVisibilitySchema>
