// @vitest-environment node
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import pg from 'pg'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { teamSearchSchema } from '../teams.schemas'
import type { db as Database } from '#/db'
import type * as TeamsService from './teams.service.server'
import type { Actor } from '#/lib/authorization/actor'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const enabled = process.env.RUN_TEAMS_DB_TESTS === '1'
const originalUrl = process.env.DATABASE_URL
const databaseName = `team_adwings_teams_test_${randomBytes(8).toString('hex')}`
let admin: pg.Client | undefined
let connection: pg.Client
let database: typeof Database | undefined
let service: typeof TeamsService
let created = false
const actor: Actor = {
  id: 'teams-manager',
  name: 'უფროსი',
  email: null,
  emailVerified: true,
  roles: ['supervisor'],
}
const search = teamSearchSchema.parse({})
async function team(id: string) {
  return (await service.readTeamWorkspace(actor, { ...search, team: id }))
    .selected!
}
async function createTeam(by: Actor, name: string) {
  return service.saveProductionTeam(by, {
    id: null,
    version: null,
    name,
    active: true,
    members: [],
    leaderId: null,
  })
}
async function mutate(
  by: Actor,
  input: {
    id: string
    version: number
    name?: string
    userId?: string | null
    fromTeamId?: string | null
  },
  action: string,
) {
  const current = await team(input.id)
  let members: Array<{ userId: string; fromTeamId: string | null }> =
    current.members.map((member) => ({
      userId: member.userId,
      fromTeamId: current.id,
    }))
  if (action === 'member_added')
    members = [
      ...members,
      { userId: input.userId!, fromTeamId: input.fromTeamId ?? null },
    ]
  if (action === 'member_removed')
    members = members.filter((member) => member.userId !== input.userId)
  let leaderId = current.members.find((member) => member.leader)?.userId ?? null
  if (action === 'leader_changed') leaderId = input.userId ?? null
  if (
    action !== 'leader_changed' &&
    leaderId &&
    !members.some((member) => member.userId === leaderId)
  )
    leaderId = null
  return service.saveProductionTeam(by, {
    id: input.id,
    version: input.version,
    name: input.name ?? current.name,
    active: action !== 'deactivated',
    members,
    leaderId,
  })
}
describe.runIf(enabled)('production teams against isolated PostgreSQL', () => {
  beforeAll(async () => {
    if (!originalUrl) throw new Error('Local PostgreSQL configuration required')
    const target = new URL(originalUrl)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
      throw new Error('Tests require local PostgreSQL')
    admin = new pg.Client({
      connectionString: originalUrl,
      connectionTimeoutMillis: 3000,
    })
    await admin.connect()
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    created = true
    target.pathname = `/${databaseName}`
    connection = new pg.Client({ connectionString: target.toString() })
    await connection.connect()
    for (const file of readdirSync('drizzle')
      .filter((name) => /^\d+.*\.sql$/.test(name))
      .sort())
      await connection.query(
        readFileSync(`drizzle/${file}`, 'utf8').replaceAll(
          '--> statement-breakpoint',
          '',
        ),
      )
    process.env.DATABASE_URL = target.toString()
    service = await import('./teams.service.server')
    database = (await import('#/db')).db
    for (const [id, roles] of [
      ['teams-manager', 'supervisor'],
      ['teams-worker', 'production_specialist'],
      ['teams-other', 'production_specialist'],
      ['teams-sales', 'sales_manager'],
      ['teams-hr', 'hr_manager'],
      ['teams-employee', 'employee'],
      ['teams-mixed-admin', 'production_specialist,admin'],
    ]) {
      await connection.query(
        'INSERT INTO "user" (id, name, email, roles) VALUES ($1, $1, $2, $3)',
        [id, `${id}@teams.invalid`, roles],
      )
      await connection.query(
        'INSERT INTO employee (username, user_id, full_name) VALUES ($1, $1, $1)',
        [id],
      )
    }
  }, 30000)
  beforeEach(async () => {
    await connection.query(
      'TRUNCATE team_event, team_membership, production_team',
    )
    await connection.query(
      'UPDATE "user" SET access_state = \'active\', permission_overrides = \'{"allow":[],"deny":[]}\'',
    )
  })
  afterAll(async () => {
    await database?.$client.end()
    await connection.end()
    process.env.DATABASE_URL = originalUrl
    if (created)
      await admin?.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`)
    await admin?.end()
  })
  it('reloads persisted permissions instead of trusting supplied roles', async () => {
    await expect(
      createTeam({ ...actor, id: 'teams-sales' }, 'გუნდი'),
    ).rejects.toThrow()
    await connection.query(
      'UPDATE "user" SET permission_overrides = \'{"allow":[],"deny":["teams.manage"]}\' WHERE id = $1',
      [actor.id],
    )
    await expect(createTeam(actor, 'გუნდი')).rejects.toThrow()
    await expect(service.readTeamWorkspace(actor, search)).rejects.toThrow()
  })
  it('transfers a leader atomically and preserves prior membership and audit', async () => {
    const first = await createTeam(actor, 'პირველი')
    const second = await createTeam(actor, 'მეორე')
    await mutate(
      actor,
      { id: first, version: 1, userId: 'teams-worker', fromTeamId: null },
      'member_added',
    )
    await mutate(
      actor,
      { id: first, version: 2, userId: 'teams-worker' },
      'leader_changed',
    )
    await mutate(
      actor,
      { id: second, version: 1, userId: 'teams-worker', fromTeamId: first },
      'member_added',
    )
    expect((await team(first)).members).toHaveLength(0)
    expect((await team(second)).members).toMatchObject([
      { userId: 'teams-worker', leader: false },
    ])
    const history = await connection.query(
      'SELECT ended_at FROM team_membership WHERE team_id = $1',
      [first],
    )
    expect(history.rows[0].ended_at).toBeTruthy()
    expect(
      (await team(first)).history.some(
        (event) => event.action === 'member_removed',
      ),
    ).toBe(true)
    await expect(
      mutate(actor, { id: first, version: 3, name: 'ძველი' }, 'renamed'),
    ).rejects.toThrow('შეიცვალა')
  })
  it('allows only one winner when a specialist is concurrently added to two teams', async () => {
    const first = await createTeam(actor, 'პირველი')
    const second = await createTeam(actor, 'მეორე')
    const results = await Promise.allSettled(
      [first, second].map((id) =>
        mutate(
          actor,
          { id, version: 1, userId: 'teams-worker', fromTeamId: null },
          'member_added',
        ),
      ),
    )
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect(
      (
        await connection.query(
          'SELECT * FROM team_membership WHERE ended_at IS NULL',
        )
      ).rowCount,
    ).toBe(1)
  })
  it('requires an empty team for deactivation and an eligible active employee for membership', async () => {
    const id = await createTeam(actor, 'პირველი')
    await expect(
      mutate(
        actor,
        { id, version: 1, userId: 'teams-hr', fromTeamId: null },
        'member_added',
      ),
    ).rejects.toThrow('დასაშვები')
    await mutate(
      actor,
      { id, version: 1, userId: 'teams-worker', fromTeamId: null },
      'member_added',
    )
    await expect(
      mutate(actor, { id, version: 2 }, 'deactivated'),
    ).rejects.toThrow('წევრი')
    await expect(
      mutate(
        actor,
        { id, version: 2, userId: 'teams-other' },
        'leader_changed',
      ),
    ).rejects.toThrow('წევრი')
    await mutate(
      actor,
      { id, version: 2, userId: 'teams-worker', fromTeamId: id },
      'member_removed',
    )
    await mutate(actor, { id, version: 3 }, 'deactivated')
    expect((await team(id)).active).toBe(false)
    await expect(
      mutate(actor, { id, version: 4, name: 'ახალი' }, 'renamed'),
    ).rejects.toThrow('გაუქმებულია')
  })
  it('rolls back roster edits if audit persistence fails', async () => {
    const id = await createTeam(actor, 'პირველი')
    await connection.query(
      "ALTER TABLE team_event ADD CONSTRAINT team_test_audit_failure CHECK (action <> 'member_added') NOT VALID",
    )
    try {
      await expect(
        mutate(
          actor,
          { id, version: 1, userId: 'teams-worker', fromTeamId: null },
          'member_added',
        ),
      ).rejects.toThrow()
      expect((await team(id)).members).toHaveLength(0)
      expect((await team(id)).version).toBe(1)
    } finally {
      await connection.query(
        'ALTER TABLE team_event DROP CONSTRAINT team_test_audit_failure',
      )
    }
  })
  it('creates the team, roster and leader in one save', async () => {
    const id = await service.saveProductionTeam(actor, {
      id: null,
      version: null,
      name: 'სრული გუნდი',
      active: true,
      members: [
        { userId: 'teams-worker', fromTeamId: null },
        { userId: 'teams-other', fromTeamId: null },
      ],
      leaderId: 'teams-other',
    })
    const saved = await team(id)
    expect(saved.members).toHaveLength(2)
    expect(saved.members.find((member) => member.leader)?.userId).toBe(
      'teams-other',
    )
    expect(saved.version).toBe(1)
  })
  it('rejects the whole draft if any specialist is ineligible', async () => {
    await expect(
      service.saveProductionTeam(actor, {
        id: null,
        version: null,
        name: 'არ შეინახო',
        active: true,
        members: [
          { userId: 'teams-worker', fromTeamId: null },
          { userId: 'teams-hr', fromTeamId: null },
        ],
        leaderId: null,
      }),
    ).rejects.toThrow('დასაშვები')
    expect((await service.readTeamWorkspace(actor, search)).total).toBe(0)
    expect(
      (await connection.query('SELECT * FROM team_membership')).rowCount,
    ).toBe(0)
  })
  it('rolls back a new team and source-team transfer when audit persistence fails', async () => {
    const source = await createTeam(actor, 'წყარო')
    await mutate(
      actor,
      { id: source, version: 1, userId: 'teams-worker', fromTeamId: null },
      'member_added',
    )
    await connection.query(
      "ALTER TABLE team_event ADD CONSTRAINT team_test_full_save_failure CHECK (action <> 'member_added') NOT VALID",
    )
    try {
      await expect(
        service.saveProductionTeam(actor, {
          id: null,
          version: null,
          name: 'ახალი გუნდი',
          active: true,
          members: [{ userId: 'teams-worker', fromTeamId: source }],
          leaderId: 'teams-worker',
        }),
      ).rejects.toThrow()
      expect((await service.readTeamWorkspace(actor, search)).total).toBe(1)
      expect((await team(source)).members).toHaveLength(1)
      expect((await team(source)).version).toBe(2)
    } finally {
      await connection.query(
        'ALTER TABLE team_event DROP CONSTRAINT team_test_full_save_failure',
      )
    }
  })
  it('returns the first 20 eligible specialists and filters job titles on the server', async () => {
    for (let index = 0; index < 25; index++) {
      const id = `teams-scroll-${index}`
      await connection.query(
        'INSERT INTO "user" (id, name, email, roles) VALUES ($1, $1, $2, $3)',
        [id, `${id}@teams.invalid`, 'production_specialist'],
      )
      await connection.query(
        'INSERT INTO employee (username, user_id, full_name, job_title) VALUES ($1, $1, $1, $2)',
        [id, index % 2 ? 'მემონტაჟე' : 'აზომვის სპეციალისტი'],
      )
    }
    await connection.query(
      "UPDATE employee SET status = 'inactive' WHERE user_id = 'teams-scroll-0'",
    )
    await connection.query(
      "UPDATE \"user\" SET access_state = 'suspended' WHERE id = 'teams-scroll-1'",
    )
    const first = await service.readTeamCandidates(actor, {
      q: '',
      jobTitle: '',
      roles: ['production_specialist'],
      page: 1,
    })
    const second = await service.readTeamCandidates(actor, {
      q: '',
      jobTitle: '',
      roles: ['production_specialist'],
      page: 2,
    })
    expect(first.items).toHaveLength(20)
    expect(second.items).toHaveLength(5)
    expect(first.total).toBe(25)
    expect(
      new Set([...first.items, ...second.items].map((item) => item.userId))
        .size,
    ).toBe(25)
    expect(
      [...first.items, ...second.items].some((item) =>
        ['teams-sales', 'teams-scroll-0', 'teams-scroll-1'].includes(
          item.userId,
        ),
      ),
    ).toBe(false)
    const filtered = await service.readTeamCandidates(actor, {
      q: 'teams-scroll',
      jobTitle: 'მემონტაჟე',
      roles: ['production_specialist'],
      page: 1,
    })
    expect(filtered.items.length).toBeGreaterThan(0)
    expect(filtered.items.every((item) => item.jobTitle === 'მემონტაჟე')).toBe(
      true,
    )
    expect(
      (
        await service.readTeamCandidates(actor, {
          q: '%',
          jobTitle: '',
          roles: ['production_specialist'],
          page: 1,
        })
      ).total,
    ).toBe(0)
    await expect(
      service.readTeamCandidates(
        { ...actor, id: 'teams-sales' },
        { q: '', jobTitle: '', roles: ['production_specialist'], page: 1 },
      ),
    ).rejects.toThrow()
  })
  it('filters operational roles and rejects privileged members at the save boundary', async () => {
    const listed = await service.readTeamCandidates(actor, {
      q: '',
      jobTitle: '',
      roles: [
        'employee',
        'production_specialist',
        'supervisor',
        'sales_manager',
      ],
      page: 1,
    })
    const ids = listed.items.map((item) => item.userId)
    expect(ids).toContain('teams-employee')
    expect(ids).toContain('teams-sales')
    expect(ids).not.toContain('teams-hr')
    expect(ids).not.toContain('teams-mixed-admin')
    expect(
      (
        await service.readTeamCandidates(actor, {
          q: '',
          jobTitle: '',
          roles: [],
          page: 1,
        })
      ).total,
    ).toBe(0)
    const id = await service.saveProductionTeam(actor, {
      id: null,
      version: null,
      name: 'თანამშრომლების გუნდი',
      active: true,
      members: [{ userId: 'teams-employee', fromTeamId: null }],
      leaderId: 'teams-employee',
    })
    expect((await team(id)).members[0].userId).toBe('teams-employee')
    await expect(
      service.saveProductionTeam(actor, {
        id: null,
        version: null,
        name: 'აკრძალული გუნდი',
        active: true,
        members: [{ userId: 'teams-mixed-admin', fromTeamId: null }],
        leaderId: null,
      }),
    ).rejects.toThrow('დასაშვები')
  })
  it('lists current member counts and leaders and updates them on transfer', async () => {
    const source = await createTeam(actor, 'წყარო')
    const target = await createTeam(actor, 'მიზანი')
    let items = (await service.readTeamWorkspace(actor, search)).items
    expect(items.find((item) => item.id === source)).toMatchObject({
      memberCount: 0,
      leaderName: null,
    })
    await service.saveProductionTeam(actor, {
      id: source,
      version: 1,
      name: 'წყარო',
      active: true,
      members: [
        { userId: 'teams-worker', fromTeamId: null },
        { userId: 'teams-other', fromTeamId: null },
      ],
      leaderId: 'teams-worker',
    })
    items = (await service.readTeamWorkspace(actor, search)).items
    expect(items.find((item) => item.id === source)).toMatchObject({
      memberCount: 2,
      leaderName: 'teams-worker',
    })
    await service.saveProductionTeam(actor, {
      id: target,
      version: 1,
      name: 'მიზანი',
      active: true,
      members: [{ userId: 'teams-worker', fromTeamId: source }],
      leaderId: null,
    })
    items = (await service.readTeamWorkspace(actor, search)).items
    expect(items.find((item) => item.id === source)).toMatchObject({
      memberCount: 1,
      leaderName: null,
    })
    expect(items.find((item) => item.id === target)).toMatchObject({
      memberCount: 1,
      leaderName: null,
    })
  })
  it('preserves audit and releases members when permanently deleting, and rejects stale versions', async () => {
    const id = await service.saveProductionTeam(actor, {
      id: null,
      version: null,
      name: 'წასაშლელი',
      active: true,
      members: [{ userId: 'teams-worker', fromTeamId: null }],
      leaderId: 'teams-worker',
    })
    await expect(
      service.changeTeamAvailability(actor, { id, version: 2 }, 'delete'),
    ).rejects.toThrow('შეიცვალა')
    await expect(
      service.changeTeamAvailability(
        { ...actor, id: 'teams-sales' },
        { id, version: 1 },
        'delete',
      ),
    ).rejects.toThrow()
    await service.changeTeamAvailability(actor, { id, version: 1 }, 'delete')
    expect(
      (
        await connection.query('SELECT * FROM production_team WHERE id = $1', [
          id,
        ])
      ).rowCount,
    ).toBe(0)
    expect(
      (
        await connection.query(
          'SELECT * FROM team_membership WHERE team_id = $1',
          [id],
        )
      ).rowCount,
    ).toBe(0)
    const audit = await connection.query(
      'SELECT * FROM team_deletion_audit WHERE team_id = $1',
      [id],
    )
    expect(audit.rows[0].actor_id).toBe(actor.id)
    expect(audit.rows[0].snapshot.memberships).toHaveLength(1)
    expect(audit.rows[0].snapshot.events.length).toBeGreaterThan(0)
    const replacement = await createTeam(actor, 'ახალი')
    await mutate(
      actor,
      { id: replacement, version: 1, userId: 'teams-worker', fromTeamId: null },
      'member_added',
    )
  })
  it('restores disabled teams without removing their history', async () => {
    const id = await createTeam(actor, 'გუნდი')
    await mutate(actor, { id, version: 1 }, 'deactivated')
    await service.changeTeamAvailability(actor, { id, version: 2 }, 'restore')
    const restored = await team(id)
    expect(restored.active).toBe(true)
    expect(
      restored.history.some((event) => event.action === 'reactivated'),
    ).toBe(true)
  })
})
