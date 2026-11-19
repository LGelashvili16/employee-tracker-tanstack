import '@tanstack/react-start/server-only'
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  isNull,
  or,
  sql,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '#/db'
import {
  employee,
  productionTeam,
  teamEvent,
  teamDeletionAudit,
  teamMembership,
  user,
} from '#/db/schema'
import { teamsPageSize } from '../teams.schemas'
import type { TeamSearch, TeamCandidateSearch } from '../teams.schemas'

export const transactTeams = db.transaction.bind(db)
export type TeamsTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]
const contains = (q: string) =>
  `%${q.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
export async function lockTeamWrites(tx: TeamsTransaction) {
  // Serialize cross-team moves, leader replacement and deactivation in a consistent order.
  await tx.execute(sql`select pg_advisory_xact_lock(715821, 1)`)
}
export async function teamIdentity(tx: TeamsTransaction, id: string) {
  const identity = (
    await tx.select().from(user).where(eq(user.id, id)).for('share')
  ).at(0)
  const person = (
    await tx.select().from(employee).where(eq(employee.userId, id)).for('share')
  ).at(0)
  return { identity, person }
}
export async function findTeam(tx: TeamsTransaction, id: string) {
  return (
    await tx.select().from(productionTeam).where(eq(productionTeam.id, id))
  ).at(0)
}
export async function listTeams(tx: TeamsTransaction, search: TeamSearch) {
  const where = and(
    eq(productionTeam.active, search.status === 'active'),
    ilike(productionTeam.name, contains(search.q)),
  )
  const [total] = await tx
    .select({ value: count() })
    .from(productionTeam)
    .where(where)
  const items = await tx
    .select({
      ...getTableColumns(productionTeam),
      memberCount: sql<number>`(select count(*)::int from "team_membership" tm where tm."team_id" = "production_team"."id" and tm."ended_at" is null)`,
      leaderName: sql<
        string | null
      >`(select e."full_name" from "team_membership" tm inner join "employee" e on e."user_id" = tm."user_id" where tm."team_id" = "production_team"."id" and tm."ended_at" is null and tm."leader" limit 1)`,
    })
    .from(productionTeam)
    .where(where)
    .orderBy(
      search.sort === 'name'
        ? asc(productionTeam.name)
        : desc(productionTeam.createdAt),
      asc(productionTeam.id),
    )
    .limit(teamsPageSize)
    .offset((search.page - 1) * teamsPageSize)
  return { items, total: total.value }
}
export async function teamRoster(tx: TeamsTransaction, id: string) {
  return tx
    .select({
      id: teamMembership.id,
      userId: teamMembership.userId,
      name: employee.fullName,
      leader: teamMembership.leader,
      status: employee.status,
    })
    .from(teamMembership)
    .innerJoin(employee, eq(employee.userId, teamMembership.userId))
    .where(and(eq(teamMembership.teamId, id), isNull(teamMembership.endedAt)))
    .orderBy(desc(teamMembership.leader), asc(employee.fullName))
}
export async function teamHistory(tx: TeamsTransaction, id: string) {
  const subject = alias(user, 'team_event_subject')
  return tx
    .select({
      id: teamEvent.id,
      action: teamEvent.action,
      details: teamEvent.details,
      createdAt: teamEvent.createdAt,
      actorName: user.name,
      subjectName: subject.name,
    })
    .from(teamEvent)
    .innerJoin(user, eq(user.id, teamEvent.actorId))
    .leftJoin(subject, sql`${subject.id} = ${teamEvent.details}->>'userId'`)
    .where(eq(teamEvent.teamId, id))
    .orderBy(desc(teamEvent.createdAt), desc(teamEvent.id))
    .limit(50)
}
export async function memberAssignment(tx: TeamsTransaction, userId: string) {
  return (
    await tx
      .select()
      .from(teamMembership)
      .where(
        and(eq(teamMembership.userId, userId), isNull(teamMembership.endedAt)),
      )
  ).at(0)
}
export async function candidateMembers(
  tx: TeamsTransaction,
  search: TeamCandidateSearch,
) {
  const where = and(
    eq(employee.status, 'active'),
    eq(user.accessState, 'active'),
    sql`string_to_array(${user.roles}, ',') && ARRAY[${sql.join(
      search.roles.map((role) => sql`${role}`),
      sql`, `,
    )}]::text[]`,
    sql`not (string_to_array(${user.roles}, ',') && ARRAY['hr_manager', 'admin', 'owner']::text[])`,
    or(
      ilike(employee.fullName, contains(search.q)),
      ilike(employee.username, contains(search.q)),
    ),
    search.jobTitle
      ? ilike(employee.jobTitle, contains(search.jobTitle))
      : undefined,
  )
  const [total] = await tx
    .select({ value: count() })
    .from(employee)
    .innerJoin(user, eq(user.id, employee.userId))
    .where(where)
  const items = await tx
    .select({
      userId: user.id,
      name: employee.fullName,
      jobTitle: employee.jobTitle,
      teamId: teamMembership.teamId,
      teamName: productionTeam.name,
    })
    .from(employee)
    .innerJoin(user, eq(user.id, employee.userId))
    .leftJoin(
      teamMembership,
      and(eq(teamMembership.userId, user.id), isNull(teamMembership.endedAt)),
    )
    .leftJoin(productionTeam, eq(productionTeam.id, teamMembership.teamId))
    .where(where)
    .orderBy(asc(employee.fullName), asc(user.id))
    .limit(teamsPageSize)
    .offset((search.page - 1) * teamsPageSize)
  return { items, total: total.value }
}
export async function insertTeam(tx: TeamsTransaction, name: string) {
  const [team] = await tx.insert(productionTeam).values({ name }).returning()
  return team
}
export async function updateTeam(
  tx: TeamsTransaction,
  id: string,
  fields: { name?: string; active?: boolean },
) {
  await tx
    .update(productionTeam)
    .set({ ...fields, version: sql`${productionTeam.version} + 1` })
    .where(eq(productionTeam.id, id))
}
export async function closeMembership(tx: TeamsTransaction, userId: string) {
  await tx
    .update(teamMembership)
    .set({ endedAt: new Date() })
    .where(
      and(eq(teamMembership.userId, userId), isNull(teamMembership.endedAt)),
    )
}
export async function insertMembership(
  tx: TeamsTransaction,
  teamId: string,
  userId: string,
) {
  await tx.insert(teamMembership).values({ teamId, userId })
}
export async function setLeader(
  tx: TeamsTransaction,
  teamId: string,
  userId: string | null,
) {
  await tx
    .update(teamMembership)
    .set({ leader: false })
    .where(
      and(eq(teamMembership.teamId, teamId), isNull(teamMembership.endedAt)),
    )
  if (userId)
    await tx
      .update(teamMembership)
      .set({ leader: true })
      .where(
        and(
          eq(teamMembership.teamId, teamId),
          eq(teamMembership.userId, userId),
          isNull(teamMembership.endedAt),
        ),
      )
}
export async function appendTeamEvent(
  tx: TeamsTransaction,
  teamId: string,
  actorId: string,
  action: string,
  details: typeof teamEvent.$inferInsert.details,
) {
  await tx.insert(teamEvent).values({ teamId, actorId, action, details })
}

export async function permanentlyDeleteTeam(
  tx: TeamsTransaction,
  team: typeof productionTeam.$inferSelect,
  actorId: string,
) {
  const memberships = await tx
    .select()
    .from(teamMembership)
    .where(eq(teamMembership.teamId, team.id))
  const events = await tx
    .select()
    .from(teamEvent)
    .where(eq(teamEvent.teamId, team.id))
  await tx
    .insert(teamDeletionAudit)
    .values({
      teamId: team.id,
      teamName: team.name,
      actorId,
      snapshot: { team, memberships, events },
    })
  await tx.delete(teamMembership).where(eq(teamMembership.teamId, team.id))
  await tx.delete(teamEvent).where(eq(teamEvent.teamId, team.id))
  await tx.delete(productionTeam).where(eq(productionTeam.id, team.id))
}
