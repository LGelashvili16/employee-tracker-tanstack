import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from '../auth/auth.schema'
import { createdAt, timestamps, uuidv7PrimaryKey } from '../_shared/columns'

/** Immutable employee submission with an explicitly scoped review workflow. */
export const complaint = pgTable(
  'complaint',
  {
    /** Time-ordered database identity; never proof of record access. */
    id: uuidv7PrimaryKey(),
    /** Client retry identity, unique per authenticated requester. */
    submissionId: uuid('submission_id').notNull(),
    /** Trusted session subject, never a submitted employee identifier. */
    requesterId: text('requester_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Employee-authored original topic and account, retained after review. */
    title: text('title').notNull(),
    /** Original plain-text account; clarifications are appended as replies. */
    description: text('description').notNull(),
    /** Stable machine category displayed through the Georgian presentation mapping. */
    category: text('category')
      .$type<'conditions' | 'equipment' | 'conduct' | 'other'>()
      .notNull(),
    /** HR-only records require an explicit confidential-access permission. */
    visibility: text('visibility').$type<'standard' | 'hr_only'>().notNull(),
    /** Explicit review state; reading a complaint does not change it. */
    status: text('status')
      .$type<'new' | 'in_review' | 'resolved' | 'closed'>()
      .notNull()
      .default('new'),
    /** Explicit complaint assignment, independent of attendance reviewers. */
    assigneeId: text('assignee_id').references(() => user.id, {
      onDelete: 'restrict',
    }),
    /** Incremented atomically on assignment, replies and status changes. */
    revision: integer('revision').notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('complaint_requester_submission').on(
      t.requesterId,
      t.submissionId,
    ),
    index('complaint_requester_recent').on(
      t.requesterId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    index('complaint_assignee_recent').on(
      t.assigneeId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    index('complaint_status_recent').on(
      t.status,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    check(
      'complaint_title_length',
      sql`length(trim(${t.title})) between 1 and 160`,
    ),
    check(
      'complaint_description_length',
      sql`length(trim(${t.description})) between 1 and 5000`,
    ),
    check(
      'complaint_category_valid',
      sql`${t.category} in ('conditions','equipment','conduct','other')`,
    ),
    check(
      'complaint_visibility_valid',
      sql`${t.visibility} in ('standard','hr_only')`,
    ),
    check(
      'complaint_status_valid',
      sql`${t.status} in ('new','in_review','resolved','closed')`,
    ),
    check('complaint_revision_valid', sql`${t.revision} >= 0`),
    check(
      'complaint_no_self_assignment',
      sql`${t.assigneeId} is null or ${t.assigneeId} <> ${t.requesterId}`,
    ),
  ],
)

/** Append-only shared conversation and audit trail. Every entry is visible to the requester. */
export const complaintActivity = pgTable(
  'complaint_activity',
  {
    /** Identity also used for durable notification deduplication. */
    id: uuidv7PrimaryKey(),
    /** Retained parent record; cascading deletion would erase the audit trail. */
    complaintId: uuid('complaint_id')
      .notNull()
      .references(() => complaint.id, { onDelete: 'restrict' }),
    /** Trusted account responsible for this entry. */
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Retry key for replies; system transitions use the complaint revision lock. */
    submissionId: uuid('submission_id'),
    /** Separates conversation replies from workflow transitions. */
    action: text('action')
      .$type<'created' | 'reply' | 'assigned' | 'status_changed'>()
      .notNull(),
    /** Reply or mandatory transition explanation; no internal-only notes. */
    body: text('body').notNull(),
    /** Before/after state for status transitions, otherwise null. */
    previousStatus: text('previous_status'),
    /** Recorded resulting status, retained when subsequent transitions occur. */
    nextStatus: text('next_status'),
    /** Previous complaint reviewer, preserved on reassignment. */
    previousAssigneeId: text('previous_assignee_id').references(() => user.id, {
      onDelete: 'restrict',
    }),
    /** Newly assigned complaint reviewer, distinct from attendance assignments. */
    nextAssigneeId: text('next_assignee_id').references(() => user.id, {
      onDelete: 'restrict',
    }),
    /** Database timestamp paired with the ID for deterministic history pagination. */
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('complaint_activity_retry').on(
      t.complaintId,
      t.actorId,
      t.submissionId,
    ),
    index('complaint_activity_recent').on(
      t.complaintId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    check(
      'complaint_activity_action_valid',
      sql`${t.action} in ('created','reply','assigned','status_changed')`,
    ),
    check(
      'complaint_activity_body_length',
      sql`length(trim(${t.body})) between 1 and 5000`,
    ),
  ],
)
