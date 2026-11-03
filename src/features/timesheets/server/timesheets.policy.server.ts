import '@tanstack/react-start/server-only'
import { assertPermission } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  assertActiveEmployee,
  isManagedTeam,
} from '#/lib/authorization/resource-scope'
import type { Actor } from '#/lib/authorization/actor'
import type { EmployeeScope } from '#/lib/authorization/resource-scope'

export type TimesheetReviewResource = {
  employeeId: string
  ownerUserId: string | null
  submittedByUserId: string | null
  teamId: string | null
  status: 'draft' | 'submitted' | 'approved' | 'returned'
  locked: boolean
}

/** Call with database-loaded facts inside the approval transaction, immediately before writing. */
export function assertCanReviewTimesheet(
  actor: Actor,
  scope: EmployeeScope,
  timesheet: TimesheetReviewResource,
) {
  assertActiveEmployee(actor, scope)
  assertPermission(actor, 'timesheets.review.team')
  if (
    timesheet.employeeId === scope.employeeId ||
    timesheet.ownerUserId === actor.id ||
    timesheet.submittedByUserId === actor.id ||
    !isManagedTeam(scope, timesheet.teamId) ||
    timesheet.status !== 'submitted' ||
    timesheet.locked
  ) {
    throw new AuthorizationError()
  }
}
