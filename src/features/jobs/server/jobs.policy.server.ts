import '@tanstack/react-start/server-only'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { parseRoles } from '#/lib/authorization/permissions'
import { allowedJobTransitions, canManageJobs } from '../jobs.rules'
import { currentIdentity } from './jobs.repository.server'
import type { Actor } from '#/lib/authorization/actor'
import type { JobsTransaction } from './jobs.repository.server'
import type { JobStatus } from '../jobs.types'

/** All active company accounts may see shared pins, including administrators without employee records. */
export async function requireJobActor(
  tx: JobsTransaction,
  actor: Actor | null,
  write = false,
): Promise<Actor> {
  if (!actor) throw new AuthorizationError()
  const { identity, person } = await currentIdentity(tx, actor.id, write)
  if (!identity || identity.state !== 'active' || person?.status === 'inactive')
    throw new AuthorizationError()
  const roles = parseRoles(identity.roles)
  if (!roles.length) throw new AuthorizationError()
  return { ...actor, roles }
}
export function assertJobManager(actor: Actor) {
  if (!canManageJobs(actor)) throw new AuthorizationError()
}
export function assertJobTransition(
  actor: Actor,
  record: { status: JobStatus; assigneeId: string | null },
  status: JobStatus,
) {
  if (!allowedJobTransitions(actor, record).includes(status))
    throw new AuthorizationError()
}
