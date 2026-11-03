import '@tanstack/react-start/server-only'
import { assertPermission } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  assertActiveEmployee,
  isManagedTeam,
} from '#/lib/authorization/resource-scope'
import type { Actor } from '#/lib/authorization/actor'
import type { EmployeeScope } from '#/lib/authorization/resource-scope'

/** Services load employee linkage on the server; list queries must also enforce this team scope in SQL. */
export function assertTeamAttendanceAccess(
  actor: Actor,
  scope: EmployeeScope,
  teamId: string | null,
) {
  assertActiveEmployee(actor, scope)
  assertPermission(actor, 'attendance.read.team')
  // Even owner/admin roles do not imply membership in every managed team.
  if (!isManagedTeam(scope, teamId)) throw new AuthorizationError()
}
