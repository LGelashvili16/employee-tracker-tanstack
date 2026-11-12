import '@tanstack/react-start/server-only'
import { notificationRealtimeSchema } from '../notifications.schemas'
import { liveNotification } from './notifications.repository.server'
import type { RealtimeHandler } from '#/lib/realtime/events-response.server'

export const notificationRealtimeHandler: RealtimeHandler = {
  topic: 'notifications',
  snapshot: async (actor) => ({
    event: 'notifications',
    data: { recipientId: actor.id, changed: false },
  }),
  changed: async (actor, signal) => {
    // This topic never accepts broadcasts, including signals without a recipient.
    if (signal.recipientId !== actor.id) return null
    const item = signal.subjectId
      ? await liveNotification(actor.id, signal.subjectId)
      : undefined
    return {
      event: 'notifications',
      data: notificationRealtimeSchema.parse({
        recipientId: actor.id,
        changed: true,
        ...(item ? { notification: item } : {}),
      }),
    }
  },
}
