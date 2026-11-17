import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { permissionsMiddleware } from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  teamCandidatesSchema,
  teamSaveSchema,
  teamSearchSchema,
  teamRevisionSchema,
} from './teams.schemas'
import { TeamWorkflowError } from './teams.rules'
import {
  saveProductionTeam,
  readTeamCandidates,
  readTeamWorkspace,
  changeTeamAvailability,
} from './server/teams.service.server'

async function safely<T>(action: () => Promise<T>) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(action) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    return {
      ok: false as const,
      message:
        error instanceof TeamWorkflowError
          ? error.message
          : 'მოქმედება ვერ შესრულდა. გადაამოწმეთ, რომ სახელი არ მეორდება, განაახლეთ მონაცემები და სცადეთ ხელახლა.',
    }
  }
}
const manager = permissionsMiddleware('teams.manage')
export const readTeams = createServerFn({ method: 'GET' })
  .middleware([manager])
  .validator(teamSearchSchema)
  .handler(({ context, data }) =>
    safely(() => readTeamWorkspace(context.actor, data)),
  )
export const readCandidates = createServerFn({ method: 'GET' })
  .middleware([manager])
  .validator(teamCandidatesSchema)
  .handler(({ context, data }) =>
    safely(() => readTeamCandidates(context.actor, data)),
  )
export const saveTeam = createServerFn({ method: 'POST' })
  .middleware([manager])
  .validator(teamSaveSchema)
  .handler(({ context, data }) =>
    safely(() => saveProductionTeam(context.actor, data)),
  )
export const deleteTeam = createServerFn({ method: 'POST' })
  .middleware([manager])
  .validator(teamRevisionSchema)
  .handler(({ context, data }) =>
    safely(() => changeTeamAvailability(context.actor, data, 'delete')),
  )
export const restoreTeam = createServerFn({ method: 'POST' })
  .middleware([manager])
  .validator(teamRevisionSchema)
  .handler(({ context, data }) =>
    safely(() => changeTeamAvailability(context.actor, data, 'restore')),
  )
