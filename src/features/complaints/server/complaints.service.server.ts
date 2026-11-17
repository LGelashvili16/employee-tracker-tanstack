import '@tanstack/react-start/server-only'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  currentAuthorization,
  hasPermission,
} from '#/lib/authorization/permissions'
import { signalRealtime } from '#/lib/realtime/postgres-events.server'
import {
  acknowledgeComplaintNotifications,
  deliverComplaintNotifications,
} from '#/features/notifications/server/notifications.service.server'
import type { Actor } from '#/lib/authorization/actor'
import {
  complaintAssignSchema,
  complaintDetailSchema,
  complaintListSchema,
  complaintReplySchema,
  complaintReviewersSchema,
  complaintStatusChangeSchema,
  createComplaintSchema,
} from '../complaints.schemas'
import {
  canAssignComplaint,
  canChangeComplaintStatus,
  canManageComplaint,
  canReadComplaint,
  canReviewComplaints,
} from '../complaints.rules'
import type { ScopedComplaint } from '../complaints.rules'
import * as repository from './complaints.repository.server'

export class ComplaintWorkflowError extends Error {}
async function authorize(
  tx: repository.ComplaintTransaction,
  actor: Pick<Actor, 'id'> | null,
  lock = false,
) {
  if (!actor) throw new AuthorizationError()
  const current = await repository.currentAccount(tx, actor.id, lock)
  if (
    !current ||
    current.state !== 'active' ||
    (current.employment && current.employment !== 'active')
  )
    throw new AuthorizationError()
  return { id: actor.id, authorization: currentAuthorization(current) }
}
async function accessible(
  tx: repository.ComplaintTransaction,
  actor: Awaited<ReturnType<typeof authorize>>,
  id: string,
  lock = false,
) {
  const item = await repository.byId(tx, id, lock)
  if (!item || !canReadComplaint(actor, item))
    throw new ComplaintWorkflowError(
      'საჩივარი ვერ მოიძებნა ან წვდომა შეზღუდულია.',
    )
  return item
}
async function publish(
  tx: repository.ComplaintTransaction,
  item: ScopedComplaint & { id: string },
  actorId: string,
  activityId: string,
) {
  await acknowledgeComplaintNotifications(tx, actorId, item.id)
  const recipients = new Set<string>([item.requesterId])
  for (const account of await repository.reviewerAccounts(tx)) {
    const scope = {
      id: account.id,
      authorization: currentAuthorization(account),
    }
    if (canManageComplaint(scope, item)) recipients.add(account.id)
  }
  // Durable inbox entries contain no complaint topic, description or employee name.
  recipients.delete(actorId)
  await deliverComplaintNotifications(tx, {
    complaintId: item.id,
    activityId,
    recipientIds: [...recipients],
  })
  await signalRealtime(tx, { topic: 'complaints', subjectId: item.id })
}
export async function listComplaints(actor: Actor | null, input: unknown) {
  const { review, ...search } = complaintListSchema.parse(input)
  return repository.transact(
    async (tx) => {
      const current = await authorize(tx, actor)
      if (review && !canReviewComplaints(current))
        throw new AuthorizationError()
      return repository.list(tx, current, search, review)
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}
export async function complaintDetail(actor: Actor | null, input: unknown) {
  const data = complaintDetailSchema.parse(input)
  return repository.transact(
    async (tx) => {
      const current = await authorize(tx, actor)
      const item = await accessible(tx, current, data.id)
      const people = await repository.names(tx, item)
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        visibility: item.visibility,
        status: item.status,
        revision: item.revision,
        assigneeId: item.assigneeId,
        ...people,
        createdAt: item.createdAt.toISOString(),
        canManage: canManageComplaint(current, item),
        canAssign: canAssignComplaint(current, item),
        activity: await repository.activity(tx, item.id, data.page ?? 1),
      }
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}
export async function createComplaint(actor: Actor | null, input: unknown) {
  const data = createComplaintSchema.parse(input)
  return repository.transact(async (tx) => {
    const current = await authorize(tx, actor, true)
    await repository.lockSubmission(tx, current.id, data.submissionId)
    const existing = await repository.submitted(
      tx,
      current.id,
      data.submissionId,
    )
    if (existing) {
      if (
        existing.title !== data.title ||
        existing.description !== data.description ||
        existing.category !== data.category ||
        existing.visibility !== 'standard'
      )
        throw new ComplaintWorkflowError(
          'წინა გაგზავნა უკვე შენახულია. გადაამოწმეთ საჩივრების სია ახალი გაგზავნის წინ.',
        )
      return { id: existing.id }
    }
    const item = await repository.insert(tx, {
      requesterId: current.id,
      submissionId: data.submissionId,
      title: data.title,
      description: data.description,
      category: data.category,
      visibility: 'standard',
    })
    const activity = await repository.append(tx, {
      complaintId: item.id,
      actorId: current.id,
      action: 'created',
      body: 'საჩივარი რეგისტრირებულია.',
    })
    await publish(tx, item, current.id, activity.id)
    return { id: item.id }
  })
}
export async function replyToComplaint(actor: Actor | null, input: unknown) {
  const data = complaintReplySchema.parse(input)
  return repository.transact(async (tx) => {
    const current = await authorize(tx, actor, true)
    const item = await accessible(tx, current, data.id, true)
    const previousReply = await repository.replied(
      tx,
      item.id,
      current.id,
      data.submissionId,
    )
    if (previousReply) {
      if (previousReply.body !== data.body)
        throw new ComplaintWorkflowError(
          'წინა პასუხი უკვე შენახულია. გადაამოწმეთ განხილვის ისტორია.',
        )
      return { id: item.id }
    }
    if (item.status === 'closed' || item.status === 'resolved')
      throw new ComplaintWorkflowError(
        'პასუხისთვის საჭიროა საჩივრის განხილვის განახლება.',
      )
    const activity = await repository.append(tx, {
      complaintId: item.id,
      actorId: current.id,
      submissionId: data.submissionId,
      action: 'reply',
      body: data.body,
    })
    await repository.update(tx, item.id, {})
    await publish(tx, item, current.id, activity.id)
    return { id: item.id }
  })
}
export async function changeComplaintStatus(
  actor: Actor | null,
  input: unknown,
) {
  const data = complaintStatusChangeSchema.parse(input)
  return repository.transact(async (tx) => {
    const current = await authorize(tx, actor, true)
    const item = await accessible(tx, current, data.id, true)
    if (!canManageComplaint(current, item)) throw new AuthorizationError()
    if (item.revision !== data.revision)
      throw new ComplaintWorkflowError(
        'საჩივარი შეიცვალა. განაახლეთ მონაცემები და სცადეთ ხელახლა.',
      )
    if (!canChangeComplaintStatus(item.status, data.status))
      throw new ComplaintWorkflowError('სტატუსის ეს ცვლილება დაუშვებელია.')
    const activity = await repository.append(tx, {
      complaintId: item.id,
      actorId: current.id,
      action: 'status_changed',
      body: data.reason,
      previousStatus: item.status,
      nextStatus: data.status,
    })
    await repository.update(tx, item.id, { status: data.status })
    await publish(tx, item, current.id, activity.id)
    return { id: item.id }
  })
}
export async function assignComplaint(actor: Actor | null, input: unknown) {
  const data = complaintAssignSchema.parse(input)
  return repository.transact(async (tx) => {
    const current = await authorize(tx, actor, true)
    const item = await accessible(tx, current, data.id, true)
    if (!canAssignComplaint(current, item)) throw new AuthorizationError()
    if (item.revision !== data.revision)
      throw new ComplaintWorkflowError(
        'საჩივარი შეიცვალა. განაახლეთ მონაცემები და სცადეთ ხელახლა.',
      )
    const target = await authorize(tx, { id: data.assigneeId }, true)
    const updated = { ...item, assigneeId: target.id }
    if (!canManageComplaint(target, updated))
      throw new ComplaintWorkflowError(
        'ამ მომხმარებელზე საჩივრის მინიჭება დაუშვებელია.',
      )
    if (item.assigneeId === target.id)
      throw new ComplaintWorkflowError('პასუხისმგებელი უკვე მინიჭებულია.')
    const people = await repository.names(tx, updated)
    const activity = await repository.append(tx, {
      complaintId: item.id,
      actorId: current.id,
      action: 'assigned',
      body: `${people.assigneeName}: ${data.reason}`,
      previousAssigneeId: item.assigneeId,
      nextAssigneeId: target.id,
    })
    await repository.update(tx, item.id, { assigneeId: target.id })
    if (item.assigneeId && item.assigneeId !== target.id)
      await signalRealtime(tx, {
        topic: 'complaints',
        recipientId: item.assigneeId,
      })
    await publish(tx, updated, current.id, activity.id)
    return { id: item.id }
  })
}
export async function complaintReviewers(actor: Actor | null, input: unknown) {
  const data = complaintReviewersSchema.parse(input)
  return repository.transact(async (tx) => {
    const current = await authorize(tx, actor)
    const item = await accessible(tx, current, data.id)
    if (!canAssignComplaint(current, item)) throw new AuthorizationError()
    return (await repository.reviewerAccounts(tx, data.q))
      .filter((account) =>
        canManageComplaint(
          { id: account.id, authorization: currentAuthorization(account) },
          { ...item, assigneeId: account.id },
        ),
      )
      .slice(0, 20)
      .map((account) => ({ id: account.id, name: account.name }))
  })
}
export async function complaintRealtimeState(actor: Actor, subjectId?: string) {
  return repository.transact(async (tx) => {
    const current = await authorize(tx, actor)
    const hasUnreadComplaints =
      canReviewComplaints(current) &&
      (await repository.unreadReviewCount(tx, current)) > 0
    if (!subjectId) return { changed: false, hasUnreadComplaints }
    const id = complaintDetailSchema.shape.id.parse(subjectId)
    const item = await repository.byId(tx, id)
    // An unassigned supervisor receives no signal revealing the record's existence.
    if (!item || !canReadComplaint(current, item)) return null
    const notification = await repository.latestNotification(tx, current.id, id)
    return {
      changed: true,
      id,
      hasUnreadComplaints,
      ...(notification
        ? {
            notification: {
              id: notification.id,
              review:
                hasPermission(current.authorization, 'manage.access') &&
                canReviewComplaints(current),
            },
          }
        : {}),
    }
  })
}
