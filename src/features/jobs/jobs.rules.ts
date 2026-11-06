import { hasPermission } from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'
import type { JobStatus } from './jobs.types'

export function hasJobCoordinates<
  T extends { longitude: number | null; latitude: number | null },
>(job: T): job is T & { longitude: number; latitude: number } {
  return job.longitude !== null && job.latitude !== null
}

export class JobWorkflowError extends Error {}
export class JobConflictError extends JobWorkflowError {}
export const canManageJobs = (actor: Actor) =>
  hasPermission(actor.roles, 'jobs.manage')

export const canEditJob = (actor: Actor, job: { status: JobStatus }) =>
  canManageJobs(actor) &&
  job.status !== 'completed' &&
  job.status !== 'rejected'

/** Claim grants are separate from management. Claiming is atomic; subsequent progress respects assignment. */
export function allowedJobTransitions(
  actor: Actor,
  job: { status: JobStatus; assigneeId: string | null },
): Array<JobStatus> {
  const manager = canManageJobs(actor)
  if (job.status === 'pending') {
    const transitions: Array<JobStatus> = []
    if (hasPermission(actor.roles, 'jobs.claim')) transitions.push('en_route')
    if (manager) transitions.push('rejected')
    return transitions
  }
  if (!manager && job.assigneeId !== actor.id) return []
  switch (job.status) {
    case 'en_route':
      return manager
        ? ['on_site', 'rejected', 'pending']
        : ['on_site', 'rejected']
    case 'on_site':
      return manager
        ? ['completed', 'rejected', 'pending']
        : ['completed', 'rejected']
    case 'completed':
    case 'rejected':
      return manager ? ['pending'] : []
  }
}
