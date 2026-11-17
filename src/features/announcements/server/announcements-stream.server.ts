import '@tanstack/react-start/server-only'
import { announcementRealtimeState } from './announcements.service.server'
import type { RealtimeHandler } from '#/lib/realtime/events-response.server'

export const announcementRealtimeHandler: RealtimeHandler = {
  topic: 'announcements',
  snapshot: async (actor) => ({
    event: 'announcements',
    data: await announcementRealtimeState(actor),
  }),
  changed: async (actor, signal) => {
    if (signal.recipientId && signal.recipientId !== actor.id) return null
    return {
      event: 'announcements',
      ...(signal.subjectId ? { id: signal.subjectId } : {}),
      data: await announcementRealtimeState(actor, signal.subjectId),
    }
  },
}
