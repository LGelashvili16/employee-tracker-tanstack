import '@tanstack/react-start/server-only'
import { z } from 'zod'
import { readActorFromHeaders } from '#/lib/auth/session.server'
import { eventStreamResponse } from './event-stream.server'
import type { RealtimeEvent } from './event-stream.server'
import type { RealtimeSignal, RealtimeTopic } from './realtime.schemas'
import type { Actor } from '#/lib/authorization/actor'

/** Features own resource authorization and safe projections, including snapshots. */
export type RealtimeHandler = {
  topic: RealtimeTopic
  snapshot: (actor: Actor) => Promise<RealtimeEvent | null>
  changed: (
    actor: Actor,
    signal: RealtimeSignal,
  ) => Promise<RealtimeEvent | null>
}

export async function eventsResponse(
  request: Request,
  handlers: ReadonlyArray<RealtimeHandler>,
) {
  const url = new URL(request.url)
  const input = z
    .object({}, { error: 'მოთხოვნა არასწორია.' })
    .strict()
    .safeParse(Object.fromEntries(url.searchParams))
  if (!input.success)
    return new Response('მოთხოვნა არასწორია.', { status: 400 })
  const origin = request.headers.get('origin')
  if (origin && (!z.url().safeParse(origin).success || origin !== url.origin))
    return new Response('წვდომა აკრძალულია.', { status: 403 })
  let actor = await readActorFromHeaders(request.headers, true)
  if (!actor)
    return new Response('საჭიროა სისტემაში შესვლა.', {
      status: 401,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  const actorId = actor.id
  const handlersByTopic = new Map<RealtimeTopic, Array<RealtimeHandler>>()
  for (const handler of handlers) {
    const registered = handlersByTopic.get(handler.topic) ?? []
    registered.push(handler)
    handlersByTopic.set(handler.topic, registered)
  }
  const accepts = (signal: RealtimeSignal) =>
    (!signal.recipientId || signal.recipientId === actorId) &&
    handlersByTopic.has(signal.topic)
  return eventStreamResponse(request, {
    accepts,
    authorized: async () => {
      actor = await readActorFromHeaders(request.headers, true)
      return actor?.id === actorId
    },
    snapshot: async () => {
      if (!actor) return null
      const currentActor = actor
      const events = await Promise.all(
        handlers.map((handler) => handler.snapshot(currentActor)),
      )
      return events.filter((event) => event !== null)
    },
    changed: async (signal) => {
      if (!actor || !accepts(signal)) return null
      const currentActor = actor
      const events = await Promise.all(
        (handlersByTopic.get(signal.topic) ?? []).map((handler) =>
          handler.changed(currentActor, signal),
        ),
      )
      return events.filter((event) => event !== null)
    },
  })
}
