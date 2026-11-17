import { z } from 'zod'
import {
  checkInSchema,
  checkOutSchema,
} from '#/features/attendance/attendance.schemas'
import { recordIdSchema } from '#/lib/route-schemas'

export const securityReasonSchema = z
  .string({ error: 'მიუთითეთ მიზეზი.' })
  .trim()
  .min(5, 'მინიმუმ 5 სიმბოლო.')
  .max(500, 'მაქსიმუმ 500 სიმბოლო.')
export const exactIpSchema = z.union([z.ipv4(), z.ipv6()], {
  error: 'მიუთითეთ ზუსტი IPv4 ან IPv6 მისამართი.',
})
const ips = z.array(exactIpSchema).max(100, 'მაქსიმუმ 100 მისამართი.')
export const securityPolicySchema = z.object({
  browserApprovalRequired: z
    .boolean({ error: 'აირჩიეთ მოწყობილობის დადასტურების წესი.' })
    .default(true),
  ipRestrictionEnabled: z.boolean({ error: 'აირჩიეთ ქსელის შეზღუდვა.' }),
  passkeyRequired: z.boolean({ error: 'აირჩიეთ დამატებითი დადასტურება.' }),
  allowedIps: ips,
  blockedIps: ips,
  revision: z
    .number({ error: 'ვერსია არასწორია.' })
    .int('მიუთითეთ მთელი რიცხვი.')
    .min(0, 'ვერსია არასწორია.'),
})
export const deviceNameSchema = z
  .string({ error: 'მიუთითეთ მოწყობილობის სახელი.' })
  .trim()
  .min(2, 'მინიმუმ 2 სიმბოლო.')
  .max(80, 'მაქსიმუმ 80 სიმბოლო.')
export const registerDeviceSchema = z.object({ name: deviceNameSchema })
export const deviceDecisionSchema = z.object({
  id: z.uuid({ error: 'იდენტიფიკატორი არასწორია.' }),
  revision: z
    .number({ error: 'ვერსია არასწორია.' })
    .int('მიუთითეთ მთელი რიცხვი.')
    .min(0, 'ვერსია არასწორია.'),
  decision: z.enum(['approved', 'rejected', 'revoked'], {
    error: 'გადაწყვეტილება არასწორია.',
  }),
})
export const employeeNetworkSchema = z.object({
  userId: recordIdSchema,
  allowedIps: ips.nullable(),
  reason: securityReasonSchema,
})
export const clockIntentSchema = z
  .discriminatedUnion('kind', [
    z.object({ kind: z.literal('in'), data: checkInSchema }),
    z.object({ kind: z.literal('out'), data: checkOutSchema }),
  ])
  .and(
    z.object({
      targetUserId: recordIdSchema.optional(),
      reason: securityReasonSchema.optional(),
    }),
  )
export const clockProofSchema = z.object({
  intent: clockIntentSchema,
  challengeId: z.uuid({ error: 'იდენტიფიკატორი არასწორია.' }).optional(),
  response: z.json({ error: 'დადასტურების პასუხი არასწორია.' }).optional(),
})
export const registrationProofSchema = z.object({
  challengeId: z.uuid({ error: 'იდენტიფიკატორი არასწორია.' }),
  response: z.json({ error: 'დადასტურების პასუხი არასწორია.' }),
})
export const securityListSchema = z.object({
  page: z
    .number({ error: 'გვერდი არასწორია.' })
    .int('გვერდი არასწორია.')
    .min(1, 'გვერდი არასწორია.')
    .max(10000, 'გვერდი არასწორია.')
    .default(1),
  q: z
    .string({ error: 'ძიება არასწორია.' })
    .trim()
    .max(100, 'მაქსიმუმ 100 სიმბოლო.')
    .default(''),
  state: z
    .enum(['all', 'pending', 'approved', 'rejected', 'revoked'], {
      error: 'სტატუსი არასწორია.',
    })
    .default('all'),
  sort: z
    .enum(['newest', 'oldest'], { error: 'დალაგება არასწორია.' })
    .default('newest'),
  userId: recordIdSchema.optional(),
})
export const securityListFormSchema = securityListSchema.extend({
  page: securityListSchema.shape.page.removeDefault(),
  q: securityListSchema.shape.q.removeDefault(),
  state: securityListSchema.shape.state.removeDefault(),
  sort: securityListSchema.shape.sort.removeDefault(),
})
export const ownSecuritySearchSchema = z.object({
  deviceQ: securityListSchema.shape.q,
  deviceState: securityListSchema.shape.state.removeDefault().default('all'),
  deviceSort: securityListSchema.shape.sort,
  devicePage: securityListSchema.shape.page,
})
export function parseIpLines(text: string) {
  return [...new Set(text.split(/[\s,;]+/).filter(Boolean))]
}
