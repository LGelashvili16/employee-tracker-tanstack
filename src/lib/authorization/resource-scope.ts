import { AuthorizationError } from './authorization-error'
import type { Actor } from './actor'

/** Load these facts from persistence on the server, never from request input or sendContext. */
export type EmployeeScope = {
  userId: string
  employeeId: string
  employmentStatus: 'active' | 'inactive'
  managedTeamIds: ReadonlyArray<string>
}

export function assertActiveEmployee(actor: Actor, scope: EmployeeScope) {
  if (
    scope.userId !== actor.id ||
    !scope.employeeId ||
    scope.employmentStatus !== 'active'
  ) {
    throw new AuthorizationError()
  }
}

/** SQL list queries must apply the same managed-team scope before pagination/counting. */
export function isManagedTeam(scope: EmployeeScope, teamId: string | null) {
  return (
    teamId !== null &&
    teamId.length > 0 &&
    scope.managedTeamIds.includes(teamId)
  )
}
