import '@tanstack/react-start/server-only'
import { complaintRealtimeState } from './complaints.service.server'
import type { RealtimeHandler } from '#/lib/realtime/events-response.server'

export const complaintRealtimeHandler: RealtimeHandler = {
  topic: 'complaints',
  snapshot: async (actor) => ({
    event: 'complaints',
    data: await complaintRealtimeState(actor),
  }),
  changed: async (actor, signal) => {
    const data = await complaintRealtimeState(actor, signal.subjectId)
    return data ? { event: 'complaints', data } : null
  },
}
