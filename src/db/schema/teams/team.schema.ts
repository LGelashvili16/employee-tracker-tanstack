import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from '../auth/auth.schema'
import { createdAt, timestamps, uuidv7PrimaryKey } from '../_shared/columns'

export const productionTeam = pgTable(
  'production_team',
  {
    id: uuidv7PrimaryKey(),
    name: text('name').notNull(),
    active: boolean('active').notNull().default(true),
    version: integer('version').notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('production_team_active_name')
      .on(sql`lower(trim(${t.name}))`)
      .where(sql`${t.active}`),
    check(
      'production_team_name_valid',
      sql`char_length(trim(${t.name})) between 2 and 100`,
    ),
    check('production_team_version_valid', sql`${t.version} > 0`),
  ],
)

/** Closing a membership preserves the roster that existed before a move. */
export const teamMembership = pgTable(
  'team_membership',
  {
    id: uuidv7PrimaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => productionTeam.id, { onDelete: 'restrict' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    leader: boolean('leader').notNull().default(false),
    joinedAt: createdAt(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('team_member_one_current_team')
      .on(t.userId)
      .where(sql`${t.endedAt} is null`),
    uniqueIndex('team_one_current_leader')
      .on(t.teamId)
      .where(sql`${t.endedAt} is null and ${t.leader}`),
    index('team_membership_history').on(t.teamId, t.joinedAt),
    check(
      'team_membership_dates_valid',
      sql`${t.endedAt} is null or ${t.endedAt} >= ${t.joinedAt}`,
    ),
  ],
)

/** Team edits and roster changes append their evidence in the same transaction. */
export const teamEvent = pgTable(
  'team_event',
  {
    id: uuidv7PrimaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => productionTeam.id, { onDelete: 'restrict' }),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    action: text('action').notNull(),
    details: jsonb('details')
      .$type<{
        name?: string
        userId?: string
        fromTeamId?: string | null
        leader?: boolean
      }>()
      .notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('team_event_history').on(t.teamId, t.createdAt, t.id)],
)

/** Preserves the full roster and event history when a team is permanently removed. */
export const teamDeletionAudit = pgTable(
  'team_deletion_audit',
  {
    id: uuidv7PrimaryKey(),
    teamId: uuid('team_id').notNull(),
    teamName: text('team_name').notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    snapshot: jsonb('snapshot')
      .$type<{
        team: typeof productionTeam.$inferSelect
        memberships: Array<typeof teamMembership.$inferSelect>
        events: Array<typeof teamEvent.$inferSelect>
      }>()
      .notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('team_deletion_audit_team').on(t.teamId)],
)
