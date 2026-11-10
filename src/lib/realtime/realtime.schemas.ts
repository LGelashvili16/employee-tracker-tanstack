import { z } from 'zod'

// Internal wake-up messages contain identifiers only, never announcement content.
export const realtimeSignalSchema = z.object({
  topic: z.literal('announcements'),
  subjectId: z.uuid().optional(),
  recipientId: z.string().min(1).max(256).optional(),
})
export type RealtimeSignal = z.infer<typeof realtimeSignalSchema>
