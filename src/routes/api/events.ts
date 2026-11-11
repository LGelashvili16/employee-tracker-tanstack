import { createFileRoute } from '@tanstack/react-router'
import { applicationEventsResponse } from '#/server/realtime/events.server'

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: { GET: ({ request }) => applicationEventsResponse(request) },
  },
})
