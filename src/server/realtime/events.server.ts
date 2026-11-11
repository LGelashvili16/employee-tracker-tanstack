import '@tanstack/react-start/server-only'
import { announcementRealtimeHandler } from '#/features/announcements/server/announcements-stream.server'
import { eventsResponse } from '#/lib/realtime/events-response.server'

/** Compose feature handlers here; shared transport never imports business features. */
export function applicationEventsResponse(request: Request) {
  return eventsResponse(request, [announcementRealtimeHandler])
}
