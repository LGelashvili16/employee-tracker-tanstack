import { z } from 'zod'
import { announcementIdSchema } from './announcements.schemas'

export const announcementRealtimeSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
  published: z
    .object({
      id: announcementIdSchema,
      title: z.string().min(1).max(160),
      showOnLogin: z.boolean(),
    })
    .optional(),
})
