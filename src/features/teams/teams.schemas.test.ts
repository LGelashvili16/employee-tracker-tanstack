import { describe, expect, it } from 'vitest'
import { hasPermission, roleSchema } from '#/lib/authorization/permissions'
import { assertTeamRevision, canJoinProductionTeam } from './teams.rules'
import {
  teamSaveSchema,
  teamNameSchema,
  teamSearchSchema,
  teamCandidatesSchema,
} from './teams.schemas'

describe('team input and access rules', () => {
  it('allows operational roles but excludes HR and platform administration even for mixed accounts', () => {
    expect(canJoinProductionTeam(['employee'])).toBe(true)
    expect(canJoinProductionTeam(['sales_manager', 'supervisor'])).toBe(true)
    for (const forbidden of ['hr_manager', 'admin', 'owner'] as const) {
      expect(canJoinProductionTeam(['production_specialist', forbidden])).toBe(
        false,
      )
      expect(
        teamCandidatesSchema.safeParse({ roles: [forbidden] }).success,
      ).toBe(false)
    }
    expect(teamCandidatesSchema.parse({}).roles).toEqual([
      'production_specialist',
    ])
    expect(
      teamCandidatesSchema.safeParse({ roles: ['employee', 'employee'] })
        .success,
    ).toBe(false)
  })
  it('grants management only to production supervisors and platform administrators by default', () => {
    for (const role of roleSchema.options)
      expect(hasPermission([role], 'teams.manage')).toBe(
        ['supervisor', 'admin', 'owner'].includes(role),
      )
  })
  it('validates search, identifiers, revisions and bounded names', () => {
    expect(teamSearchSchema.parse({})).toMatchObject({
      page: 1,
      status: 'active',
      q: '',
      sort: 'name',
    })
    for (const input of [
      { page: -1 },
      { sort: 'sql' },
      { team: 'bad' },
      { q: 'a'.repeat(101) },
    ])
      expect(teamSearchSchema.safeParse(input).success).toBe(false)
    expect(teamNameSchema.parse({ name: '  გუნდი  ' }).name).toBe('გუნდი')
    expect(teamNameSchema.safeParse({ name: ' ' }).success).toBe(false)
    expect(
      teamSaveSchema.safeParse({ name: 'გუნდი', version: 0 }).success,
    ).toBe(false)
    expect(teamSaveSchema.safeParse({ userId: 'x' }).success).toBe(false)
  })
  it('rejects stale and inactive team mutations', () => {
    expect(() => assertTeamRevision({ version: 2, active: true }, 1)).toThrow(
      'შეიცვალა',
    )
    expect(() => assertTeamRevision({ version: 2, active: false }, 2)).toThrow(
      'გაუქმებულია',
    )
  })
  it('rejects duplicate members, a nonmember leader and an inconsistent revision', () => {
    const data = {
      id: null,
      version: null,
      name: 'გუნდი',
      active: true,
      members: [{ userId: 'person', fromTeamId: null }],
      leaderId: null,
    }
    expect(teamSaveSchema.safeParse(data).success).toBe(true)
    expect(
      teamSaveSchema.safeParse({ ...data, leaderId: 'other' }).success,
    ).toBe(false)
    expect(
      teamSaveSchema.safeParse({
        ...data,
        members: [...data.members, ...data.members],
      }).success,
    ).toBe(false)
    expect(teamSaveSchema.safeParse({ ...data, version: 1 }).success).toBe(
      false,
    )
    expect(teamSaveSchema.safeParse({ ...data, active: false }).success).toBe(
      false,
    )
  })
})
