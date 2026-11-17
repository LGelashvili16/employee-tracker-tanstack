import '@tanstack/react-start/server-only'
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '#/db'
import {
  complaint,
  complaintActivity,
  employee,
  notification,
  user,
} from '#/db/schema'
import { hasPermission } from '#/lib/authorization/permissions'
import type { ComplaintSearch } from '../complaints.schemas'
import type { ComplaintScope } from '../complaints.rules'

export type ComplaintTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]
export const transact = db.transaction.bind(db)
const requester = alias(user, 'complaint_requester')
const assignee = alias(user, 'complaint_assignee')
export async function currentAccount(
  tx: ComplaintTransaction,
  id: string,
  lock = false,
) {
  const query = tx
    .select({
      id: user.id,
      roles: user.roles,
      permissionOverrides: user.permissionOverrides,
      state: user.accessState,
    })
    .from(user)
    .where(eq(user.id, id))
  const account = (await (lock ? query.for('share') : query)).at(0)
  if (!account) return null
  const personQuery = tx
    .select({ status: employee.status })
    .from(employee)
    .where(eq(employee.userId, id))
  const person = (await (lock ? personQuery.for('share') : personQuery)).at(0)
  return { ...account, employment: person?.status ?? null }
}
export function visibleScope(actor: ComplaintScope, review: boolean) {
  const all = hasPermission(actor.authorization, 'complaints.review.all')
  const confidential =
    all && hasPermission(actor.authorization, 'complaints.read.confidential')
  const reviewScope = or(
    all ? eq(complaint.visibility, 'standard') : undefined,
    confidential ? eq(complaint.visibility, 'hr_only') : undefined,
    hasPermission(actor.authorization, 'complaints.review.assigned')
      ? and(
          eq(complaint.assigneeId, actor.id),
          eq(complaint.visibility, 'standard'),
        )
      : undefined,
  )
  return review
    ? (reviewScope ?? sql`false`)
    : eq(complaint.requesterId, actor.id)
}
export async function list(
  tx: ComplaintTransaction,
  actor: ComplaintScope,
  search: ComplaintSearch,
  review: boolean,
) {
  const q = search.q?.replace(/[\\%_]/g, '\\$&')
  const where = and(
    visibleScope(actor, review),
    search.status && search.status !== 'all'
      ? eq(complaint.status, search.status)
      : undefined,
    q
      ? or(ilike(complaint.title, `%${q}%`), ilike(requester.name, `%${q}%`))
      : undefined,
  )
  const direction = search.sort === 'oldest' ? asc : desc
  const items = await tx
    .select({
      id: complaint.id,
      title: complaint.title,
      category: complaint.category,
      visibility: complaint.visibility,
      status: complaint.status,
      createdAt: complaint.createdAt,
      requesterName: requester.name,
      requesterImage: requester.image,
      assigneeName: assignee.name,
    })
    .from(complaint)
    .innerJoin(requester, eq(requester.id, complaint.requesterId))
    .leftJoin(assignee, eq(assignee.id, complaint.assigneeId))
    .where(where)
    .orderBy(direction(complaint.createdAt), direction(complaint.id))
    .limit(20)
    .offset(((search.page ?? 1) - 1) * 20)
  const [summary] = await tx
    .select({ total: count() })
    .from(complaint)
    .innerJoin(requester, eq(requester.id, complaint.requesterId))
    .where(where)
  return {
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    total: summary.total,
    pageSize: 20,
  }
}
export async function byId(tx: ComplaintTransaction, id: string, lock = false) {
  const query = tx.select().from(complaint).where(eq(complaint.id, id))
  return (await (lock ? query.for('update') : query)).at(0)
}
export async function names(
  tx: ComplaintTransaction,
  item: typeof complaint.$inferSelect,
) {
  const people = await tx
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(
      or(
        eq(user.id, item.requesterId),
        item.assigneeId ? eq(user.id, item.assigneeId) : undefined,
      ),
    )
  return {
    requesterName:
      people.find((person) => person.id === item.requesterId)?.name ?? '',
    assigneeName:
      people.find((person) => person.id === item.assigneeId)?.name ?? null,
  }
}
export async function activity(
  tx: ComplaintTransaction,
  id: string,
  page: number,
) {
  const items = await tx
    .select({
      id: complaintActivity.id,
      actorName: user.name,
      action: complaintActivity.action,
      body: complaintActivity.body,
      previousStatus: complaintActivity.previousStatus,
      nextStatus: complaintActivity.nextStatus,
      createdAt: complaintActivity.createdAt,
    })
    .from(complaintActivity)
    .innerJoin(user, eq(user.id, complaintActivity.actorId))
    .where(eq(complaintActivity.complaintId, id))
    .orderBy(desc(complaintActivity.createdAt), desc(complaintActivity.id))
    .limit(20)
    .offset((page - 1) * 20)
  const [summary] = await tx
    .select({ total: count() })
    .from(complaintActivity)
    .where(eq(complaintActivity.complaintId, id))
  return {
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    total: summary.total,
    pageSize: 20,
  }
}
/** Narrow to potentially privileged accounts, then apply current grants and exceptions in policy. */
export async function reviewerAccounts(tx: ComplaintTransaction, q = '') {
  const escaped = q.replace(/[\\%_]/g, '\\$&')
  return tx
    .select({
      id: user.id,
      name: user.name,
      roles: user.roles,
      permissionOverrides: user.permissionOverrides,
    })
    .from(user)
    .leftJoin(employee, eq(employee.userId, user.id))
    .where(
      and(
        eq(user.accessState, 'active'),
        or(isNull(employee.id), eq(employee.status, 'active')),
        sql`(${user.roles} ~ '(^|,)(hr_manager|supervisor|admin|owner)(,|$)' or (${user.permissionOverrides}->'allow') ?| array['complaints.review.all','complaints.review.assigned'])`,
        escaped ? ilike(user.name, `%${escaped}%`) : undefined,
      ),
    )
    .orderBy(asc(user.name), asc(user.id))
}
export async function insert(
  tx: ComplaintTransaction,
  value: typeof complaint.$inferInsert,
) {
  return (await tx.insert(complaint).values(value).returning())[0]
}
export async function submitted(
  tx: ComplaintTransaction,
  actorId: string,
  submissionId: string,
) {
  return (
    await tx
      .select()
      .from(complaint)
      .where(
        and(
          eq(complaint.requesterId, actorId),
          eq(complaint.submissionId, submissionId),
        ),
      )
  ).at(0)
}
export async function lockSubmission(
  tx: ComplaintTransaction,
  actorId: string,
  id: string,
) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`complaint:${actorId}:${id}`}, 0))`,
  )
}
export async function replied(
  tx: ComplaintTransaction,
  id: string,
  actorId: string,
  submissionId: string,
) {
  return (
    await tx
      .select({ id: complaintActivity.id, body: complaintActivity.body })
      .from(complaintActivity)
      .where(
        and(
          eq(complaintActivity.complaintId, id),
          eq(complaintActivity.actorId, actorId),
          eq(complaintActivity.submissionId, submissionId),
        ),
      )
  ).at(0)
}
export async function append(
  tx: ComplaintTransaction,
  value: typeof complaintActivity.$inferInsert,
) {
  return (
    await tx
      .insert(complaintActivity)
      .values(value)
      .returning({ id: complaintActivity.id })
  )[0]
}
export async function update(
  tx: ComplaintTransaction,
  id: string,
  value: Pick<Partial<typeof complaint.$inferInsert>, 'status' | 'assigneeId'>,
) {
  await tx
    .update(complaint)
    .set({
      ...value,
      revision: sql`${complaint.revision} + 1`,
      updatedAt: sql`now()`,
    })
    .where(eq(complaint.id, id))
}

/** The management dot tracks unread active work; completed complaints remain in inbox history. */
export async function unreadReviewCount(
  tx: ComplaintTransaction,
  actor: ComplaintScope,
) {
  const [summary] = await tx
    .select({ total: count() })
    .from(notification)
    .innerJoin(complaint, eq(complaint.id, notification.complaintId))
    .where(
      and(
        eq(notification.recipientId, actor.id),
        isNull(notification.seenAt),
        or(eq(complaint.status, 'new'), eq(complaint.status, 'in_review')),
        visibleScope(actor, true),
        sql`${complaint.requesterId} <> ${actor.id}`,
      ),
    )
  return summary.total
}

/** Only the latest committed activity may produce a transient alert; actor-created changes have no self delivery. */
export async function latestNotification(
  tx: ComplaintTransaction,
  actorId: string,
  id: string,
) {
  const latest = tx
    .select({ id: complaintActivity.id })
    .from(complaintActivity)
    .where(eq(complaintActivity.complaintId, id))
    .orderBy(desc(complaintActivity.createdAt), desc(complaintActivity.id))
    .limit(1)
  return (
    await tx
      .select({ id: notification.id })
      .from(notification)
      .where(
        and(
          eq(notification.recipientId, actorId),
          eq(notification.complaintId, id),
          isNull(notification.seenAt),
          eq(notification.complaintActivityId, latest),
        ),
      )
      .limit(1)
  ).at(0)
}
