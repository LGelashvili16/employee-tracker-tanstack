import type { Role } from '#/lib/authorization/permissions'

export const teamMemberRoles = [
  'production_specialist',
  'employee',
  'supervisor',
  'sales_manager',
] as const
export const excludedTeamRoles = ['hr_manager', 'admin', 'owner'] as const
export function canJoinProductionTeam(roles: ReadonlyArray<Role>) {
  return (
    !roles.some((role) =>
      excludedTeamRoles.some((excluded) => excluded === role),
    ) &&
    roles.some((role) => teamMemberRoles.some((allowed) => allowed === role))
  )
}

export class TeamWorkflowError extends Error {}
export function assertTeamRevision(
  team: { version: number; active: boolean },
  version: number,
) {
  if (team.version !== version)
    throw new TeamWorkflowError(
      'გუნდი შეიცვალა. განაახლეთ მონაცემები და სცადეთ ხელახლა.',
    )
  if (!team.active) throw new TeamWorkflowError('გუნდი გაუქმებულია.')
}
