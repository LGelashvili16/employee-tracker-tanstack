import '@tanstack/react-start/server-only'
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  lte,
  gte,
  ne,
  or,
  sql,
  inArray,
  isNull,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '#/db'
import { employee, leaveAudit, leaveRequest, user } from '#/db/schema'
import type { LeaveSearch } from '../leave.schemas'

export type LeaveTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]
export const transact = db.transaction.bind(db)
const reviewer = alias(user, 'leave_reviewer')
export async function currentAccount(
  tx: LeaveTransaction,
  id: string,
  lock = false,
) {
  const identityQuery = tx
    .select({
      state: user.accessState,
      roles: user.roles,
      permissionOverrides: user.permissionOverrides,
    })
    .from(user)
    .where(eq(user.id, id))
  const identity = (
    await (lock ? identityQuery.for('share') : identityQuery)
  ).at(0)
  if (!identity) return undefined
  const personQuery = tx
    .select({ status: employee.status })
    .from(employee)
    .where(eq(employee.userId, id))
  const person = (await (lock ? personQuery.for('share') : personQuery)).at(0)
  return { ...identity, employment: person?.status ?? null }
}
/** Transaction-scoped requester lock serializes overlap checks even when there are no requests. Hash collisions only serialize unrelated requests. */
export async function lockRequester(tx: LeaveTransaction, id: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`leave:${id}`}, 0))`,
  )
}
export async function requestById(tx: LeaveTransaction, id: string) {
  return (
    await tx.select().from(leaveRequest).where(eq(leaveRequest.id, id)).limit(1)
  ).at(0)
}
export async function approvedForDate(
  tx: LeaveTransaction,
  requesterId: string,
  date: string,
) {
  return (
    (
      await tx
        .select({
          kind: leaveRequest.kind,
          startDate: leaveRequest.startDate,
          endDate: leaveRequest.endDate,
        })
        .from(leaveRequest)
        .where(
          and(
            eq(leaveRequest.requesterId, requesterId),
            eq(leaveRequest.status, 'approved'),
            lte(leaveRequest.startDate, date),
            or(isNull(leaveRequest.endDate), gte(leaveRequest.endDate, date)),
          ),
        )
        .orderBy(desc(leaveRequest.createdAt), desc(leaveRequest.id))
        .limit(1)
    ).at(0) ?? null
  )
}
export async function overlaps(
  tx: LeaveTransaction,
  requesterId: string,
  start: string,
  end: string | null,
  excluding?: string,
) {
  return (
    (
      await tx
        .select({ id: leaveRequest.id })
        .from(leaveRequest)
        .where(
          and(
            eq(leaveRequest.requesterId, requesterId),
            inArray(leaveRequest.status, ['pending', 'approved']),
            end ? lte(leaveRequest.startDate, end) : undefined,
            or(isNull(leaveRequest.endDate), gte(leaveRequest.endDate, start)),
            excluding ? ne(leaveRequest.id, excluding) : undefined,
          ),
        )
        .limit(1)
    ).length > 0
  )
}
export async function insert(
  tx: LeaveTransaction,
  value: typeof leaveRequest.$inferInsert,
) {
  return (await tx.insert(leaveRequest).values(value).returning())[0]
}
export async function update(
  tx: LeaveTransaction,
  id: string,
  revision: number,
  value: Pick<
    typeof leaveRequest.$inferInsert,
    | 'startDate'
    | 'endDate'
    | 'status'
    | 'reviewerId'
    | 'reviewReason'
    | 'reviewedAt'
    | 'chargedVacationDays'
  >,
) {
  return (
    await tx
      .update(leaveRequest)
      .set({ ...value, revision: revision + 1 })
      .where(
        and(
          eq(leaveRequest.id, id),
          eq(leaveRequest.revision, revision),
          eq(leaveRequest.status, 'pending'),
        ),
      )
      .returning()
  ).at(0)
}
export async function audit(
  tx: LeaveTransaction,
  value: typeof leaveAudit.$inferInsert,
) {
  await tx.insert(leaveAudit).values(value)
}
/** Ownership and the unreviewed state are repeated in the write to fail closed if the workflow changes. */
export async function cancel(
  tx: LeaveTransaction,
  id: string,
  requesterId: string,
  revision: number,
) {
  return (
    await tx
      .update(leaveRequest)
      .set({ status: 'cancelled', revision: revision + 1 })
      .where(
        and(
          eq(leaveRequest.id, id),
          eq(leaveRequest.requesterId, requesterId),
          eq(leaveRequest.revision, revision),
          eq(leaveRequest.status, 'pending'),
          isNull(leaveRequest.reviewedAt),
        ),
      )
      .returning()
  ).at(0)
}
export async function list(
  tx: LeaveTransaction,
  requesterId: string | null,
  input: LeaveSearch,
) {
  const escaped = input.q?.replace(/[\\%_]/g, '\\$&')
  const where = and(
    requesterId ? eq(leaveRequest.requesterId, requesterId) : undefined,
    input.status && input.status !== 'all'
      ? eq(leaveRequest.status, input.status)
      : undefined,
    escaped
      ? or(
          ilike(user.name, `%${escaped}%`),
          ilike(employee.fullName, `%${escaped}%`),
          ilike(leaveRequest.note, `%${escaped}%`),
        )
      : undefined,
  )
  const order =
    input.sort === 'oldest'
      ? asc(leaveRequest.createdAt)
      : input.sort === 'date-asc'
        ? asc(leaveRequest.startDate)
        : input.sort === 'date-desc'
          ? desc(leaveRequest.startDate)
          : desc(leaveRequest.createdAt)
  const items = await tx
    .select({
      id: leaveRequest.id,
      requesterId: leaveRequest.requesterId,
      name: sql<string>`coalesce(${employee.fullName}, ${user.name})`,
      image: user.image,
      kind: leaveRequest.kind,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      note: leaveRequest.note,
      status: leaveRequest.status,
      canCancel: requesterId
        ? sql<boolean>`${leaveRequest.status} = 'pending' and ${leaveRequest.reviewedAt} is null`
        : sql<boolean>`false`,
      revision: leaveRequest.revision,
      reviewReason: leaveRequest.reviewReason,
      reviewerName: reviewer.name,
      createdAt: leaveRequest.createdAt,
    })
    .from(leaveRequest)
    .innerJoin(user, eq(user.id, leaveRequest.requesterId))
    .leftJoin(employee, eq(employee.userId, user.id))
    .leftJoin(reviewer, eq(reviewer.id, leaveRequest.reviewerId))
    .where(where)
    .orderBy(order, desc(leaveRequest.id))
    .limit(20)
    .offset(((input.page ?? 1) - 1) * 20)
  const [count] = await tx
    .select({ total: sql<number>`count(*)::int` })
    .from(leaveRequest)
    .innerJoin(user, eq(user.id, leaveRequest.requesterId))
    .leftJoin(employee, eq(employee.userId, user.id))
    .where(where)
  return {
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    total: count.total,
    pageSize: 20,
  }
}

/** Closure only reduces an open sick-leave interval; requester locking and current authorization are established by the workflow. */
export async function closeSick(
  tx: LeaveTransaction,
  id: string,
  revision: number,
  endDate: string,
) {
  return (
    await tx
      .update(leaveRequest)
      .set({ endDate, revision: revision + 1 })
      .where(
        and(
          eq(leaveRequest.id, id),
          eq(leaveRequest.revision, revision),
          eq(leaveRequest.kind, 'sick_leave'),
          isNull(leaveRequest.endDate),
          inArray(leaveRequest.status, ['pending', 'approved']),
        ),
      )
      .returning()
  ).at(0)
}
