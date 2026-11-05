import { describe, expect, it, vi } from 'vitest'
import { assertActiveEmployee } from './resource-scope'
import { AuthorizationError } from './authorization-error'
import { assertCanReviewTimesheet } from '#/features/timesheets/server/timesheets.policy.server'
import { assertTeamAttendanceAccess } from '#/features/attendance/server/attendance.policy.server'
import type { Actor } from './actor'
import type { EmployeeScope } from './resource-scope'
import type { TimesheetReviewResource } from '#/features/timesheets/server/timesheets.policy.server'

vi.mock('@tanstack/react-start/server-only', () => ({}))

const actor: Actor = {
  id: 'reviewer',
  name: 'ტესტი',
  email: 'reviewer@example.com',
  emailVerified: true,
  roles: ['supervisor'],
}
const scope: EmployeeScope = {
  userId: actor.id,
  employeeId: 'employee-reviewer',
  employmentStatus: 'active',
  managedTeamIds: ['team-a'],
}
const timesheet: TimesheetReviewResource = {
  employeeId: 'employee-target',
  ownerUserId: 'target-user',
  submittedByUserId: 'target-user',
  teamId: 'team-a',
  status: 'submitted',
  locked: false,
}

describe('server resource policies', () => {
  it('allows scoped team access and submitted timesheet review', () => {
    expect(() => assertActiveEmployee(actor, scope)).not.toThrow()
    expect(() =>
      assertTeamAttendanceAccess(actor, scope, 'team-a'),
    ).not.toThrow()
    expect(() =>
      assertCanReviewTimesheet(actor, scope, timesheet),
    ).not.toThrow()
  })
  it.each(['team-b', null, ''])(
    'denies out-of-scope attendance and review: %s',
    (teamId) => {
      expect(() => assertTeamAttendanceAccess(actor, scope, teamId)).toThrow(
        AuthorizationError,
      )
      expect(() =>
        assertCanReviewTimesheet(actor, scope, { ...timesheet, teamId }),
      ).toThrow(AuthorizationError)
    },
  )
  it.each<Partial<EmployeeScope>>([
    { userId: 'forged-actor' },
    { employeeId: '' },
    { employmentStatus: 'inactive' },
    { managedTeamIds: [] },
  ])('denies missing or mismatched employment/scope facts: %j', (changes) => {
    expect(() =>
      assertCanReviewTimesheet(actor, { ...scope, ...changes }, timesheet),
    ).toThrow(AuthorizationError)
  })
  it.each<Partial<TimesheetReviewResource>>([
    { employeeId: scope.employeeId },
    { ownerUserId: actor.id },
    { submittedByUserId: actor.id },
    { status: 'draft' },
    { status: 'returned' },
    { status: 'approved' },
    { locked: true },
  ])('denies self-approval and invalid workflow states: %j', (changes) => {
    expect(() =>
      assertCanReviewTimesheet(actor, scope, { ...timesheet, ...changes }),
    ).toThrow(AuthorizationError)
  })
  it('denies employees without review permission', () => {
    for (const roles of [['employee']] as const) {
      expect(() =>
        assertCanReviewTimesheet(
          { ...actor, roles: [...roles] },
          scope,
          timesheet,
        ),
      ).toThrow(AuthorizationError)
    }
  })
  it('denies platform-only administrators even when employment and team scope match', () => {
    const admin: Actor = { ...actor, roles: ['admin'] }
    expect(() => assertTeamAttendanceAccess(admin, scope, 'team-a')).toThrow(
      AuthorizationError,
    )
    expect(() => assertCanReviewTimesheet(admin, scope, timesheet)).toThrow(
      AuthorizationError,
    )
  })
  it('allows administrators with an explicit management role while preserving workflow protections', () => {
    const admin: Actor = { ...actor, roles: ['admin', 'supervisor'] }
    expect(() =>
      assertCanReviewTimesheet(admin, scope, timesheet),
    ).not.toThrow()
    for (const changes of [
      { ownerUserId: actor.id },
      { teamId: 'other-team' },
      { locked: true },
    ]) {
      expect(() =>
        assertCanReviewTimesheet(admin, scope, { ...timesheet, ...changes }),
      ).toThrow(AuthorizationError)
    }
  })
  it('does not allow owners to bypass team scope or self-approval', () => {
    const owner: Actor = { ...actor, roles: ['owner'] }
    expect(() =>
      assertCanReviewTimesheet(owner, scope, {
        ...timesheet,
        teamId: 'other-team',
      }),
    ).toThrow(AuthorizationError)
    expect(() =>
      assertCanReviewTimesheet(owner, scope, {
        ...timesheet,
        ownerUserId: actor.id,
      }),
    ).toThrow(AuthorizationError)
  })
})
