import '@tanstack/react-start/server-only'
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import { db } from '#/db'
import {
  announcement,
  announcementRecipient,
  employee,
  user,
} from '#/db/schema'
import type {
  AnnouncementSearch,
  publishAnnouncementSchema,
} from '../announcements.schemas'
import type { z } from 'zod'

export type AnnouncementTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]
export const transact = db.transaction.bind(db)

export async function insertPublication(
  tx: AnnouncementTransaction,
  actorId: string,
  data: z.infer<typeof publishAnnouncementSchema>,
) {
  return (
    await tx
      .insert(announcement)
      .values({
        authorId: actorId,
        requestId: data.requestId,
        title: data.title,
        body: data.body,
        showOnLogin: data.showOnLogin,
      })
      .onConflictDoNothing({
        target: [announcement.authorId, announcement.requestId],
      })
      .returning({ id: announcement.id })
  ).at(0)
}
export async function publicationForRequest(
  tx: AnnouncementTransaction,
  actorId: string,
  requestId: string,
) {
  return (
    await tx
      .select({
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        showOnLogin: announcement.showOnLogin,
      })
      .from(announcement)
      .where(
        and(
          eq(announcement.authorId, actorId),
          eq(announcement.requestId, requestId),
        ),
      )
  ).at(0)
}

export async function currentAccount(
  tx: AnnouncementTransaction,
  userId: string,
) {
  return (
    await tx
      .select({
        roles: user.roles,
        permissionOverrides: user.permissionOverrides,
        accessState: user.accessState,
        employmentStatus: employee.status,
      })
      .from(user)
      .leftJoin(employee, eq(employee.userId, user.id))
      .where(eq(user.id, userId))
      .for('share', { of: user })
  ).at(0)
}
const summary = {
  id: announcement.id,
  title: announcement.title,
  publishedAt: announcement.publishedAt,
  showOnLogin: announcement.showOnLogin,
  readAt: announcementRecipient.readAt,
}
const recipientJoin = (actorId: string) =>
  and(
    eq(announcementRecipient.announcementId, announcement.id),
    eq(announcementRecipient.userId, actorId),
  )

export async function list(
  tx: AnnouncementTransaction,
  actorId: string,
  input: AnnouncementSearch,
) {
  const term = `%${input.q.replace(/[\\%_]/g, '\\$&')}%`
  const where = and(
    input.q
      ? or(ilike(announcement.title, term), ilike(announcement.body, term))
      : undefined,
    input.status === 'unread'
      ? isNull(announcementRecipient.readAt)
      : input.status === 'read'
        ? isNotNull(announcementRecipient.readAt)
        : undefined,
  )
  const order = input.sort === 'newest' ? desc : asc
  const items = await tx
    .select(summary)
    .from(announcement)
    .leftJoin(announcementRecipient, recipientJoin(actorId))
    .where(where)
    .orderBy(order(announcement.publishedAt), order(announcement.id))
    .limit(20)
    .offset((input.page - 1) * 20)
  const [total] = await tx
    .select({ value: count() })
    .from(announcement)
    .leftJoin(announcementRecipient, recipientJoin(actorId))
    .where(where)
  return { items, total: total.value }
}
export async function detail(
  tx: AnnouncementTransaction,
  actorId: string,
  id: string,
) {
  return (
    (
      await tx
        .select({ ...summary, body: announcement.body })
        .from(announcement)
        .leftJoin(announcementRecipient, recipientJoin(actorId))
        .where(eq(announcement.id, id))
        .limit(1)
    ).at(0) ?? null
  )
}
export async function nextLogin(
  tx: AnnouncementTransaction,
  actorId: string,
  loginAt: Date,
) {
  return (
    (
      await tx
        .select({ ...summary, body: announcement.body })
        .from(announcement)
        .innerJoin(announcementRecipient, recipientJoin(actorId))
        .where(
          and(
            eq(announcement.showOnLogin, true),
            lte(announcement.publishedAt, loginAt),
            isNull(announcementRecipient.dismissedAt),
            isNull(announcementRecipient.readAt),
          ),
        )
        .orderBy(asc(announcement.publishedAt), asc(announcement.id))
        .limit(1)
    ).at(0) ?? null
  )
}
export async function snapshotRecipients(
  tx: AnnouncementTransaction,
  id: string,
) {
  await tx.execute(sql`insert into ${announcementRecipient} (announcement_id, user_id)
    select ${id}::uuid, ${user.id} from ${user} inner join ${employee} on ${employee.userId} = ${user.id}
    where ${employee.status} = 'active' and ${user.accessState} in ('active', 'invited')`)
}
export async function acknowledge(
  tx: AnnouncementTransaction,
  actorId: string,
  id: string,
  action: 'dismiss' | 'read',
) {
  await tx
    .insert(announcementRecipient)
    .values({
      announcementId: id,
      userId: actorId,
      dismissedAt: sql`now()`,
      readAt: action === 'read' ? sql`now()` : null,
    })
    .onConflictDoUpdate({
      target: [
        announcementRecipient.announcementId,
        announcementRecipient.userId,
      ],
      set: {
        dismissedAt: sql`coalesce(${announcementRecipient.dismissedAt}, now())`,
        ...(action === 'read'
          ? { readAt: sql`coalesce(${announcementRecipient.readAt}, now())` }
          : {}),
      },
    })
}
