import { AuthorizationError } from '#/lib/authorization/authorization-error'
import '@tanstack/react-start/server-only'
import { requireJobActor } from './jobs.policy.server'
import { transactJobs } from './jobs.repository.server'
import type { RealtimeHandler } from '#/lib/realtime/events-response.server'
import type { Actor } from '#/lib/authorization/actor'

async function event(actor: Actor, changed: boolean) {
  try {
    return await transactJobs(async (tx) => {
      await requireJobActor(tx, actor)
      return { event: 'jobs', data: { recipientId: actor.id, changed } }
    })
  } catch (error) {
    if (error instanceof AuthorizationError) return null
    throw error
  }
}
/** Identifier-only invalidation; queries recheck current workspace authorization. */
export const jobsRealtimeHandler: RealtimeHandler = {
  topic: 'jobs',
  snapshot: (actor) => event(actor, false),
  changed: (actor, signal) =>
    signal.recipientId && signal.recipientId !== actor.id
      ? Promise.resolve(null)
      : event(actor, true),
}
