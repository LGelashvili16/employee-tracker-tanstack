import { createFileRoute } from '@tanstack/react-router'
import { announcementEventsResponse } from '#/features/announcements/server/announcements-stream.server'

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: { GET: ({ request }) => announcementEventsResponse(request) },
  },
})
