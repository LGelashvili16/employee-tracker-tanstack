import '@tanstack/react-start/server-only'
import { currentAuthorization } from '#/lib/authorization/permissions'
import { assertPermission } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { signalRealtime } from '#/lib/realtime/postgres-events.server'
import {
  acknowledgeAnnouncementNotification,
  deliverAnnouncementNotifications,
} from '#/features/notifications/server/notifications.service.server'
import {
  acknowledgeAnnouncementSchema,
  announcementLookupSchema,
  announcementSearchSchema,
  publishAnnouncementSchema,
} from '../announcements.schemas'
import * as repository from './announcements.repository.server'
import type { Actor } from '#/lib/authorization/actor'

export class AnnouncementError extends Error {}
async function authorized(
  tx: repository.AnnouncementTransaction,
  actor: Actor | null,
  manage = false,
) {
  if (!actor) throw new AuthorizationError()
  const record = await repository.currentAccount(tx, actor.id)
  if (
    !record ||
    record.accessState !== 'active' ||
    record.employmentStatus === 'inactive'
  )
    throw new AuthorizationError()
  if (manage)
    assertPermission(
      { ...actor, ...currentAuthorization(record) },
      'announcements.manage',
    )
  return actor.id
}
function serialize<T extends { publishedAt: Date; readAt: Date | null }>(
  row: T,
) {
  return {
    ...row,
    publishedAt: row.publishedAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  }
}
export async function listAnnouncements(actor: Actor | null, input: unknown) {
  const data = announcementSearchSchema.parse(input)
  return repository.transact(
    async (tx) => {
      const actorId = await authorized(tx, actor)
      const result = await repository.list(tx, actorId, data)
      return { ...result, items: result.items.map(serialize) }
    },
    { isolationLevel: 'repeatable read' },
  )
}
export async function getAnnouncement(actor: Actor | null, input: unknown) {
  const { id } = announcementLookupSchema.parse(input)
  return repository.transact(async (tx) => {
    const actorId = await authorized(tx, actor)
    const result = await repository.detail(tx, actorId, id)
    if (!result) throw new AnnouncementError('განცხადება ვერ მოიძებნა.')
    return serialize(result)
  })
}
export async function getLoginAnnouncement(actor: Actor | null, loginAt: Date) {
  return repository.transact(
    async (tx) => {
      const actorId = await authorized(tx, actor)
      const result = await repository.nextLogin(tx, actorId, loginAt)
      return {
        item: result.item ? serialize(result.item) : null,
        remaining: result.remaining,
      }
    },
    { isolationLevel: 'repeatable read' },
  )
}
export async function publishAnnouncement(actor: Actor | null, input: unknown) {
  const data = publishAnnouncementSchema.parse(input)
  return repository.transact(async (tx) => {
    const actorId = await authorized(tx, actor, true)
    // Serialize retries from the same publisher; publication and delivery commit together.
    const created = await repository.insertPublication(tx, actorId, data)
    if (!created) {
      const existing = await repository.publicationForRequest(
        tx,
        actorId,
        data.requestId,
      )
      if (
        !existing ||
        existing.title !== data.title ||
        existing.body !== data.body ||
        existing.showOnLogin !== data.showOnLogin
      )
        throw new AnnouncementError(
          'მოთხოვნა შეიცვალა. განაახლეთ გვერდი და სცადეთ ხელახლა.',
        )
      return { id: existing.id }
    }
    await repository.snapshotRecipients(tx, created.id, actorId)
    if (!data.showOnLogin)
      await deliverAnnouncementNotifications(tx, {
        id: created.id,
        title: data.title,
      })
    await signalRealtime(tx, { topic: 'announcements', subjectId: created.id })
    return created
  })
}
export async function acknowledgeAnnouncement(
  actor: Actor | null,
  input: unknown,
) {
  const data = acknowledgeAnnouncementSchema.parse(input)
  return repository.transact(async (tx) => {
    const actorId = await authorized(tx, actor)
    if (!(await repository.detail(tx, actorId, data.id)))
      throw new AnnouncementError('განცხადება ვერ მოიძებნა.')
    await repository.acknowledge(tx, actorId, data.id, data.action)
    if (data.action === 'read')
      await acknowledgeAnnouncementNotification(tx, actorId, data.id)
    await signalRealtime(tx, { topic: 'announcements', recipientId: actorId })
    return { id: data.id }
  })
}

/** Minimal stream projection; recipients and current account access are checked in persistence. */
export async function announcementRealtimeState(
  actor: Actor | null,
  publishedId?: string,
) {
  if (publishedId)
    publishedId = announcementLookupSchema.shape.id.parse(publishedId)
  return repository.transact(async (tx) => {
    const actorId = await authorized(tx, actor)
    const unreadCount = await repository.unreadCount(tx, actorId)
    const publication = publishedId
      ? await repository.deliveredPublication(tx, actorId, publishedId)
      : undefined
    return {
      unreadCount,
      ...(publication && publication.authorId !== actorId
        ? {
            published: {
              id: publication.id,
              title: publication.title,
              showOnLogin: publication.showOnLogin,
            },
          }
        : {}),
    }
  })
}
