import '@tanstack/react-start/server-only'
import { assertPermission } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { parseRoles } from '#/lib/authorization/permissions'
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
  if (!person && permission !== 'attendance.configure')
    throw new AuthorizationError()
  const current = { ...actor, roles: parseRoles(identity.roles) }
  assertPermission(current, permission)
  return current
}
