import '@tanstack/react-start/server-only'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { announcementRecipient, notification } from '#/db/schema'
import type { db } from '#/db'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  markNotificationsSeenSchema,
  notificationListSchema,
} from '../notifications.schemas'
import * as repository from './notifications.repository.server'
import type { Actor } from '#/lib/authorization/actor'
import type { NotificationList } from '../notifications.types'

type NotificationTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

/** Announcement publication owns the transaction; inbox delivery must succeed or roll back with it. */
export async function deliverAnnouncementNotifications(
  tx: NotificationTransaction,
  value: { id: string; title: string },
) {
  await tx.execute(sql`insert into ${notification} (recipient_id, title, body, announcement_id)
    select ${announcementRecipient.userId}, ${value.title}, 'ახალი განცხადება გამოქვეყნდა. გახსენით სრულად სანახავად.', ${value.id}::uuid
    from ${announcementRecipient} where ${announcementRecipient.announcementId} = ${value.id}::uuid
    on conflict (announcement_id, recipient_id) do nothing`)
}
/** Explicit announcement reading also clears that recipient's corresponding inbox alert. */
export async function acknowledgeAnnouncementNotification(
  tx: NotificationTransaction,
  actorId: string,
  id: string,
) {
  await tx
    .update(notification)
    .set({ seenAt: sql`now()` })
    .where(
      and(
        eq(notification.recipientId, actorId),
        eq(notification.announcementId, id),
        isNull(notification.seenAt),
      ),
    )
}

export async function listOwnNotifications(
  actor: Actor | null,
  input: unknown,
): Promise<NotificationList> {
  if (!actor) throw new AuthorizationError()
  const { limit, offset } = notificationListSchema.parse(input)
  const result = await repository.listForRecipient(actor.id, limit, offset)
  return {
    unseenCount: result.unseenCount,
    hasMore: result.items.length > limit,
    items: result.items.slice(0, limit).map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      seenAt: item.seenAt?.toISOString() ?? null,
    })),
  }
}

export async function markOwnNotificationsSeen(
  actor: Actor | null,
  input: unknown,
) {
  if (!actor) throw new AuthorizationError()
  const { ids } = markNotificationsSeenSchema.parse(input)
  return repository.markSeenForRecipient(actor.id, ids)
}

export async function markOwnNotificationsUnseen(
  actor: Actor | null,
  input: unknown,
) {
  if (!actor) throw new AuthorizationError()
  const { ids } = markNotificationsSeenSchema.parse(input)
  return repository.markUnseenForRecipient(actor.id, ids)
}
