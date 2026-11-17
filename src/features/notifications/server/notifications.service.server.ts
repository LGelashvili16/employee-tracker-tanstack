import '@tanstack/react-start/server-only'
import type { DeliverNotificationsInput } from '../notifications.schemas'
import type { NotificationTransaction } from './notifications.repository.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  hasAnyPermission,
  hasPermission,
} from '#/lib/authorization/permissions'
import {
  deliverNotificationsSchema,
  markNotificationsSeenSchema,
  notificationListSchema,
} from '../notifications.schemas'
import * as repository from './notifications.repository.server'
import type { Actor } from '#/lib/authorization/actor'
import type { NotificationList } from '../notifications.types'

/** Caller owns recipient authorization and transaction; signals arrive after commit. */
export function deliverNotifications(
  tx: NotificationTransaction,
  input: DeliverNotificationsInput,
) {
  return repository.insertDelivery(tx, deliverNotificationsSchema.parse(input))
}

/** A single tick may deliver many distinct events; validate each before any writes. */
export function deliverNotificationBatch(
  tx: NotificationTransaction,
  values: Array<DeliverNotificationsInput>,
) {
  return repository.insertDeliveries(
    tx,
    values.map((value) => deliverNotificationsSchema.parse(value)),
  )
}

/** Complaint workflow owns authorization, recipient selection and the transaction. */
export async function deliverComplaintNotifications(
  tx: NotificationTransaction,
  value: {
    complaintId: string
    activityId: string
    recipientIds: Array<string>
  },
) {
  const inserted: Array<{ id: string; recipientId: string }> = []
  for (let offset = 0; offset < value.recipientIds.length; offset += 1000) {
    inserted.push(
      ...(await repository.insertDelivery(
        tx,
        deliverNotificationsSchema.parse({
          eventKey: `complaint:${value.activityId}`,
          recipientIds: value.recipientIds.slice(offset, offset + 1000),
          title: 'საჩივრის განახლება',
          body: 'საჩივართან დაკავშირებული ახალი ინფორმაცია ხელმისაწვდომია.',
          liveToast: false,
        }),
        {
          complaintId: value.complaintId,
          complaintActivityId: value.activityId,
        },
      )),
    )
  }
  return inserted
}

/** The complaint workflow owns the transaction and signals the resulting inbox state after commit. */
export async function acknowledgeComplaintNotifications(
  tx: NotificationTransaction,
  actorId: string,
  complaintId: string,
) {
  return repository.acknowledgeRelated(tx, actorId, { complaintId })
}

/** Announcement publication owns the transaction; inbox delivery must succeed or roll back with it. */
export async function deliverAnnouncementNotifications(
  tx: NotificationTransaction,
  value: { id: string; title: string },
) {
  const inserted: Array<{ id: string; recipientId: string }> = []
  let afterId: string | undefined
  for (;;) {
    const recipients = await repository.announcementRecipients(
      tx,
      value.id,
      afterId,
    )
    if (!recipients.length) break
    inserted.push(
      ...(await repository.insertDelivery(
        tx,
        deliverNotificationsSchema.parse({
          eventKey: `announcement:${value.id}`,
          recipientIds: recipients.map((item) => item.id),
          title: value.title,
          body: 'ახალი განცხადება გამოქვეყნდა. გახსენით სრულად სანახავად.',
          liveToast: false,
        }),
        { announcementId: value.id, allowInvited: true },
      )),
    )
    afterId = recipients.at(-1)!.id
  }
  return inserted
}
/** Explicit announcement reading also clears that recipient's corresponding inbox alert. */
export async function acknowledgeAnnouncementNotification(
  tx: NotificationTransaction,
  actorId: string,
  id: string,
) {
  return repository.acknowledgeRelated(tx, actorId, { announcementId: id })
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
      ...(item.complaintId
        ? {
            complaintReview:
              hasPermission(actor, 'manage.access') &&
              hasAnyPermission(actor, [
                'complaints.review.all',
                'complaints.review.assigned',
              ]),
          }
        : {}),
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

export async function markAllOwnNotificationsSeen(actor: Actor | null) {
  if (!actor) throw new AuthorizationError()
  return repository.markAllSeenForRecipient(actor.id)
}

export async function markOwnNotificationsUnseen(
  actor: Actor | null,
  input: unknown,
) {
  if (!actor) throw new AuthorizationError()
  const { ids } = markNotificationsSeenSchema.parse(input)
  return repository.markUnseenForRecipient(actor.id, ids)
}
