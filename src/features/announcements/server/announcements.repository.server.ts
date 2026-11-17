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
  lt,
  ne,
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
}
// Authors already know their publication; keep it visible with read status, without delivery.
const reading = (actorId: string) =>
  sql<Date | null>`case when ${announcement.authorId} = ${actorId} then ${announcement.publishedAt} else ${announcementRecipient.readAt} end`.mapWith(
    announcement.publishedAt,
  )
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
      ? isNull(reading(actorId))
      : input.status === 'read'
        ? isNotNull(reading(actorId))
        : undefined,
  )
  const order = input.sort === 'newest' ? desc : asc
  const items = await tx
    .select({
      ...summary,
      readAt: reading(actorId),
      authorName: user.name,
    })
    .from(announcement)
    .innerJoin(user, eq(user.id, announcement.authorId))
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
        .select({
          ...summary,
          readAt: reading(actorId),
          body: announcement.body,
          isRecipient: sql<boolean>`${announcementRecipient.userId} is not null`,
        })
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
  const where = and(
    eq(announcement.showOnLogin, true),
    ne(announcement.authorId, actorId),
    isNull(announcementRecipient.readAt),
    or(
      isNull(announcementRecipient.dismissedAt),
      lt(announcementRecipient.dismissedAt, loginAt),
    ),
  )
  const items = await tx
    .select({ ...summary, readAt: reading(actorId), body: announcement.body })
    .from(announcement)
    .innerJoin(announcementRecipient, recipientJoin(actorId))
    .where(where)
    .orderBy(asc(announcement.publishedAt), asc(announcement.id))
    .limit(1)
  const [total] = await tx
    .select({ value: count() })
    .from(announcement)
    .innerJoin(announcementRecipient, recipientJoin(actorId))
    .where(where)
  return { item: items.at(0) ?? null, remaining: total.value }
}
export async function snapshotRecipients(
  tx: AnnouncementTransaction,
  id: string,
  authorId: string,
) {
  await tx.execute(sql`insert into ${announcementRecipient} (announcement_id, user_id)
    select ${id}::uuid, ${user.id} from ${user} inner join ${employee} on ${employee.userId} = ${user.id}
    where ${employee.status} = 'active' and ${user.accessState} in ('active', 'invited') and ${user.id} <> ${authorId}`)
}
export async function acknowledge(
  tx: AnnouncementTransaction,
  actorId: string,
  id: string,
  action: 'dismiss' | 'read',
) {
  if (action === 'dismiss') {
    // Closing historical content must not enroll a later employee in old modal delivery.
    await tx
      .update(announcementRecipient)
      .set({ dismissedAt: sql`now()` })
      .where(
        and(
          eq(announcementRecipient.announcementId, id),
          eq(announcementRecipient.userId, actorId),
        ),
      )
    return
  }
  await tx
    .insert(announcementRecipient)
    .values({
      announcementId: id,
      userId: actorId,
      dismissedAt: sql`now()`,
      readAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: [
        announcementRecipient.announcementId,
        announcementRecipient.userId,
      ],
      set: {
        dismissedAt: sql`now()`,
        readAt: sql`coalesce(${announcementRecipient.readAt}, now())`,
      },
    })
}

export async function unreadCount(
  tx: AnnouncementTransaction,
  actorId: string,
) {
  const [result] = await tx
    .select({ value: count() })
    .from(announcementRecipient)
    .innerJoin(
      announcement,
      eq(announcement.id, announcementRecipient.announcementId),
    )
    .where(
      and(
        eq(announcementRecipient.userId, actorId),
        isNull(announcementRecipient.readAt),
        ne(announcement.authorId, actorId),
      ),
    )
  return result.value
}

export async function deliveredPublication(
  tx: AnnouncementTransaction,
  actorId: string,
  id: string,
) {
  return (
    await tx
      .select({
        id: announcement.id,
        title: announcement.title,
        authorId: announcement.authorId,
        showOnLogin: announcement.showOnLogin,
      })
      .from(announcement)
      .innerJoin(announcementRecipient, recipientJoin(actorId))
      .where(and(eq(announcement.id, id), isNull(announcementRecipient.readAt)))
  ).at(0)
}
