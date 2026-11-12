import { z } from 'zod'

export const realtimeTopicSchema = z.enum([
  'announcements',
  'complaints',
  'notifications',
  'jobs',
])
export type RealtimeTopic = z.infer<typeof realtimeTopicSchema>

// Internal wake-up messages contain identifiers only, never feature content.
export const realtimeSignalSchema = z.object({
  topic: realtimeTopicSchema,
  subjectId: z.uuid().optional(),
  recipientId: z.string().min(1).max(256).optional(),
})
export type RealtimeSignal = z.infer<typeof realtimeSignalSchema>
