import '@tanstack/react-start/server-only'
import { assertPermission } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  currentAuthorization,
  hasAnyPermission,
  hasPermission,
} from '#/lib/authorization/permissions'
import type { Permission } from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'
import type { AttendanceTransaction } from './attendance.repository.server'
import { attendanceActor } from './attendance-review.repository.server'

export async function authorizeAttendance(
  tx: AttendanceTransaction,
  actor: Actor | null,
  permission: Permission,
) {
  if (!actor) throw new AuthorizationError()
  const { identity, person } = await attendanceActor(tx, actor.id)
  if (
    !identity ||
    identity.state !== 'active' ||
    (person && person.status !== 'active')
  )
    throw new AuthorizationError()
  if (
    !person &&
    permission !== 'attendance.configure' &&
    permission !== 'attendance.read.all'
  )
    throw new AuthorizationError()
  const current = { ...actor, ...currentAuthorization(identity) }
  assertPermission(current, permission)
  return current
}

/** Directory scope is derived from current persistence; assigned managers never inherit company-wide access. */
export async function authorizeAttendanceWorkspace(
  tx: AttendanceTransaction,
  actor: Actor | null,
) {
  if (!actor) throw new AuthorizationError()
  const { identity, person } = await attendanceActor(tx, actor.id)
  if (
    !identity ||
    identity.state !== 'active' ||
    (person && person.status !== 'active')
  )
    throw new AuthorizationError()
  const current = { ...actor, ...currentAuthorization(identity) }
  assertPermission(current, 'manage.access')
  if (
    !hasAnyPermission(current, [
      'attendance.read.all',
      'attendance.read.team',
      'timesheets.review.team',
    ])
  )
    throw new AuthorizationError()
  const company = hasPermission(current, 'attendance.read.all')
  if (!company && !person) throw new AuthorizationError()
  return {
    actor: current,
    company,
    canReadAttendance:
      company || hasPermission(current, 'attendance.read.team'),
    canReadTimesheets:
      company || hasPermission(current, 'timesheets.review.team'),
  }
}
