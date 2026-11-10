import '@tanstack/react-start/server-only'
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
  notExists,
} from 'drizzle-orm'
import { db } from '#/db'
import { announcement, notification } from '#/db/schema'

export async function listForRecipient(
  recipientId: string,
  limit: number,
  offset: number,
) {
  return db.transaction(
    async (tx) => {
      // Also hides self-delivery rows from publications created before author exclusion.
      const visible = and(
        eq(notification.recipientId, recipientId),
        notExists(
          tx
            .select({ id: announcement.id })
            .from(announcement)
            .where(
              and(
                eq(announcement.id, notification.announcementId),
                eq(announcement.authorId, recipientId),
              ),
            ),
        ),
      )
      const items = await tx
        .select({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          announcementId: notification.announcementId,
          createdAt: notification.createdAt,
          seenAt: notification.seenAt,
        })
        .from(notification)
        .where(visible)
        .orderBy(desc(notification.createdAt), desc(notification.id))
        .limit(limit + 1)
        .offset(offset)
      const [summary] = await tx
        .select({ value: count() })
        .from(notification)
        .where(and(visible, isNull(notification.seenAt)))
      return { items, unseenCount: summary.value }
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}

export async function markSeenForRecipient(
  recipientId: string,
  ids: Array<string>,
) {
  // Scope the write itself; repeated or foreign IDs neither expose nor modify another inbox.
  const updated = await db
    .update(notification)
    .set({ seenAt: sql`now()` })
    .where(
      and(
        eq(notification.recipientId, recipientId),
        inArray(notification.id, ids),
        isNull(notification.seenAt),
      ),
    )
    .returning({ id: notification.id })
  return { updatedCount: updated.length }
}

export async function markUnseenForRecipient(
  recipientId: string,
  ids: Array<string>,
) {
  const updated = await db
    .update(notification)
    .set({ seenAt: null })
    .where(
      and(
        eq(notification.recipientId, recipientId),
        inArray(notification.id, ids),
        isNotNull(notification.seenAt),
      ),
    )
    .returning({ id: notification.id })
  return { updatedCount: updated.length }
}
