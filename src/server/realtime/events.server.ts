import { jobsRealtimeHandler } from '#/features/jobs/server/jobs-stream.server'
import '@tanstack/react-start/server-only'
import { notificationRealtimeHandler } from '#/features/notifications/server/notifications-stream.server'
import { announcementRealtimeHandler } from '#/features/announcements/server/announcements-stream.server'
import { eventsResponse } from '#/lib/realtime/events-response.server'
import { complaintRealtimeHandler } from '#/features/complaints/server/complaints-stream.server'

/** Compose feature handlers here; shared transport never imports business features. */
export function applicationEventsResponse(request: Request) {
  return eventsResponse(request, [
    jobsRealtimeHandler,
    notificationRealtimeHandler,
    announcementRealtimeHandler,
    complaintRealtimeHandler,
  ])
}
