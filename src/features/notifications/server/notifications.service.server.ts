import '@tanstack/react-start/server-only'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  markNotificationsSeenSchema,
  notificationListSchema,
} from '../notifications.schemas'
import * as repository from './notifications.repository.server'
import type { Actor } from '#/lib/authorization/actor'
import type { NotificationList } from '../notifications.types'

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
