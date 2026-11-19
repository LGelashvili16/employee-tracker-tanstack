import '@tanstack/react-start/server-only'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  currentAuthorization,
  hasPermission,
  parseRoles,
} from '#/lib/authorization/permissions'
import {
  assertTeamRevision,
  TeamWorkflowError,
  canJoinProductionTeam,
} from '../teams.rules'
import * as repository from './teams.repository.server'
import type { Actor } from '#/lib/authorization/actor'
import type {
  TeamSearch,
  TeamSave,
  TeamCandidateSearch,
} from '../teams.schemas'
import { teamSaveSchema } from '../teams.schemas'

export async function changeTeamAvailability(
  actor: Actor,
  input: { id: string; version: number },
  action: 'delete' | 'restore',
) {
  return repository.transactTeams(async (tx) => {
    await repository.lockTeamWrites(tx)
    await requireManager(tx, actor)
    const team = await repository.findTeam(tx, input.id)
    if (!team) throw new TeamWorkflowError('გუნდი ვერ მოიძებნა.')
    if (team.version !== input.version)
      throw new TeamWorkflowError(
        'გუნდი შეიცვალა. განაახლეთ მონაცემები და სცადეთ ხელახლა.',
      )
    if (action === 'delete')
      await repository.permanentlyDeleteTeam(tx, team, actor.id)
    else {
      if (team.active) throw new TeamWorkflowError('გუნდი უკვე მოქმედია.')
      await repository.updateTeam(tx, team.id, { active: true })
      await repository.appendTeamEvent(tx, team.id, actor.id, 'reactivated', {})
    }
    return team.id
  })
}

/** Validate the complete draft before changing any roster or source team. */
export async function saveProductionTeam(actor: Actor, input: TeamSave) {
  const data = teamSaveSchema.parse(input)
  return repository.transactTeams(async (tx) => {
    await repository.lockTeamWrites(tx)
    await requireManager(tx, actor)
    const existing = data.id ? await repository.findTeam(tx, data.id) : null
    if (data.id && !existing) throw new TeamWorkflowError('გუნდი ვერ მოიძებნა.')
    if (existing) assertTeamRevision(existing, data.version!)
    const roster = existing ? await repository.teamRoster(tx, existing.id) : []
    const additions: Array<{ userId: string; fromTeamId: string | null }> = []
    for (const member of data.members) {
      const current = await repository.memberAssignment(tx, member.userId)
      if ((current?.teamId ?? null) !== member.fromTeamId)
        throw new TeamWorkflowError(
          'თანამშრომლის გუნდი შეიცვალა. განაახლეთ მონაცემები.',
        )
      const retained = existing && current?.teamId === existing.id
      const { identity, person } = await repository.teamIdentity(
        tx,
        member.userId,
      )
      if (
        !identity ||
        identity.accessState !== 'active' ||
        person?.status !== 'active' ||
        !canJoinProductionTeam(parseRoles(identity.roles))
      )
        throw new TeamWorkflowError(
          'აირჩიეთ მოქმედი თანამშრომელი დასაშვები როლით.',
        )
      if (!retained) additions.push(member)
    }
    const team = existing ?? (await repository.insertTeam(tx, data.name))
    if (!existing)
      await repository.appendTeamEvent(tx, team.id, actor.id, 'created', {
        name: data.name,
      })
    for (const member of roster) {
      if (data.members.some((draft) => draft.userId === member.userId)) continue
      await repository.closeMembership(tx, member.userId)
      await repository.appendTeamEvent(
        tx,
        team.id,
        actor.id,
        'member_removed',
        { userId: member.userId },
      )
    }
    for (const member of additions) {
      await repository.closeMembership(tx, member.userId)
      if (member.fromTeamId) {
        await repository.updateTeam(tx, member.fromTeamId, {})
        await repository.appendTeamEvent(
          tx,
          member.fromTeamId,
          actor.id,
          'member_removed',
          { userId: member.userId },
        )
      }
      await repository.insertMembership(tx, team.id, member.userId)
      await repository.appendTeamEvent(tx, team.id, actor.id, 'member_added', {
        userId: member.userId,
        fromTeamId: member.fromTeamId,
      })
    }
    const previousLeader =
      roster.find((member) => member.leader)?.userId ?? null
    if (data.leaderId !== previousLeader) {
      await repository.setLeader(tx, team.id, data.leaderId)
      await repository.appendTeamEvent(
        tx,
        team.id,
        actor.id,
        'leader_changed',
        data.leaderId ? { userId: data.leaderId } : {},
      )
    }
    if (existing) {
      await repository.updateTeam(tx, team.id, {
        name: data.name,
        active: data.active,
      })
      if (data.name !== existing.name)
        await repository.appendTeamEvent(tx, team.id, actor.id, 'renamed', {
          name: data.name,
        })
      if (!data.active)
        await repository.appendTeamEvent(
          tx,
          team.id,
          actor.id,
          'deactivated',
          {},
        )
    }
    return team.id
  })
}

async function requireManager(tx: repository.TeamsTransaction, actor: Actor) {
  const { identity, person } = await repository.teamIdentity(tx, actor.id)
  if (
    !identity ||
    identity.accessState !== 'active' ||
    person?.status === 'inactive' ||
    !hasPermission(currentAuthorization(identity), 'teams.manage')
  )
    throw new AuthorizationError()
}
export async function readTeamWorkspace(actor: Actor, search: TeamSearch) {
  return repository.transactTeams(
    async (tx) => {
      await requireManager(tx, actor)
      const list = await repository.listTeams(tx, search)
      const selected = search.team
        ? await repository.findTeam(tx, search.team)
        : undefined
      return {
        ...list,
        selected: selected
          ? {
              ...selected,
              members: await repository.teamRoster(tx, selected.id),
              history: await repository.teamHistory(tx, selected.id),
            }
          : null,
      }
    },
    { isolationLevel: 'repeatable read' },
  )
}
export async function readTeamCandidates(
  actor: Actor,
  search: TeamCandidateSearch,
) {
  return repository.transactTeams(
    async (tx) => {
      await requireManager(tx, actor)
      return repository.candidateMembers(tx, search)
    },
    { isolationLevel: 'repeatable read' },
  )
}
