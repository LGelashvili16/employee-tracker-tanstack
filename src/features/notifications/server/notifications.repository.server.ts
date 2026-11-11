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
import { signalRealtime } from '#/lib/realtime/postgres-events.server'
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
          complaintId: notification.complaintId,
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

export function markSeenForRecipient(recipientId: string, ids: Array<string>) {
  return setSeenForRecipient(recipientId, ids, true)
}
export function markUnseenForRecipient(
  recipientId: string,
  ids: Array<string>,
) {
  return setSeenForRecipient(recipientId, ids, false)
}
async function setSeenForRecipient(
  recipientId: string,
  ids: Array<string>,
  seen: boolean,
) {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(notification)
      .set({ seenAt: seen ? sql`now()` : null })
      .where(
        and(
          eq(notification.recipientId, recipientId),
          inArray(notification.id, ids),
          seen ? isNull(notification.seenAt) : isNotNull(notification.seenAt),
        ),
      )
      .returning({ id: notification.id, complaintId: notification.complaintId })
    // Reading on any device reconciles the recipient's complaint dot after commit.
    if (updated.some((item) => item.complaintId !== null))
      await signalRealtime(tx, { topic: 'complaints', recipientId })
    return { updatedCount: updated.length }
  })
}
