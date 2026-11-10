import '@tanstack/react-start/server-only'
import { z } from 'zod'
import { readActorFromHeaders } from '#/lib/auth/session.server'
import { eventStreamResponse } from '#/lib/realtime/event-stream.server'
import { announcementRealtimeState } from './announcements.service.server'

export async function announcementEventsResponse(request: Request) {
  const url = new URL(request.url)
  const input = z
    .object({}, { error: 'მოთხოვნა არასწორია.' })
    .strict()
    .safeParse(Object.fromEntries(url.searchParams))
  if (!input.success)
    return new Response('მოთხოვნა არასწორია.', { status: 400 })
  // EventSource is same-origin. Do not expose a credentialed stream through cross-origin embedding.
  const origin = request.headers.get('origin')
  if (origin && (!z.url().safeParse(origin).success || origin !== url.origin))
    return new Response('წვდომა აკრძალულია.', { status: 403 })
  const actor = await readActorFromHeaders(request.headers, true)
  if (!actor)
    return new Response('საჭიროა სისტემაში შესვლა.', {
      status: 401,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  return eventStreamResponse(request, {
    accepts: (signal) => !signal.recipientId || signal.recipientId === actor.id,
    authorized: async () =>
      (await readActorFromHeaders(request.headers, true))?.id === actor.id,
    snapshot: async () => ({
      event: 'announcements',
      data: await announcementRealtimeState(actor),
    }),
    changed: async (signal) => {
      if (signal.recipientId && signal.recipientId !== actor.id) return null
      return {
        event: 'announcements',
        ...(signal.subjectId ? { id: signal.subjectId } : {}),
        data: await announcementRealtimeState(actor, signal.subjectId),
      }
    },
  })
}
