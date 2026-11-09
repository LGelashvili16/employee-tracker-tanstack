import { getCompanyWorkday } from '#/features/scheduling/server/scheduling.service.server'
import '@tanstack/react-start/server-only'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  currentAuthorization,
  hasPermission,
} from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'
import {
  createLeaveSchema,
  leaveSearchSchema,
  reviewLeaveSchema,
  hasValidDayOffDates,
  singleDayError,
  cancelLeaveSchema,
  closeSickLeaveSchema,
  hasValidLeaveRange,
} from '../leave.schemas'
import * as repository from './leave.repository.server'
import type { ApprovedLeave } from '../leave.types'
import {
  prepareDayOffAllowance,
  consumeDayOff,
  consumePaidVacation,
} from './day-off-allowance.service.server'

/** Internal attendance read. The caller establishes an active employee and supplies their trusted account and company-local work date. */
export async function readApprovedLeaveForAttendance(
  tx: repository.LeaveTransaction,
  requesterId: string,
  date: string,
  lock = false,
): Promise<ApprovedLeave | null> {
  // Clock-in holds this through insertion so a concurrent vacation decision cannot bypass confirmation.
  if (lock) await repository.lockRequester(tx, requesterId)
  return repository.approvedForDate(tx, requesterId, date)
}

export class LeaveWorkflowError extends Error {}
async function authorize(
  tx: repository.LeaveTransaction,
  actor: Actor | null,
  review = false,
  lock = false,
) {
  if (!actor) throw new AuthorizationError()
  const account = await repository.currentAccount(tx, actor.id, lock)
  if (
    !account ||
    account.state !== 'active' ||
    (account.employment && account.employment !== 'active')
  )
    throw new AuthorizationError()
  if (review && !hasPermission(currentAuthorization(account), 'leave.review'))
    throw new AuthorizationError()
  return actor
}
export async function listLeave(
  actor: Actor | null,
  input: unknown,
  review = false,
) {
  const search = leaveSearchSchema.parse(input)
  return repository.transact(
    async (tx) => {
      const current = await authorize(tx, actor, review)
      return repository.list(tx, review ? null : current.id, search)
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}
function facts(value: {
  kind: string
  startDate: string
  endDate: string | null
  status: string
  revision: number
  chargedVacationDays: number
}) {
  return {
    kind: value.kind,
    startDate: value.startDate,
    endDate: value.endDate,
    status: value.status,
    revision: value.revision,
    chargedVacationDays: value.chargedVacationDays,
  }
}
export async function createLeave(actor: Actor | null, input: unknown) {
  const data = createLeaveSchema.parse(input)
  return repository.transact(async (tx) => {
    const current = await authorize(tx, actor, false, true)
    await repository.lockRequester(tx, current.id)
    // Recheck employment after obtaining the serialization lock.
    await authorize(tx, actor)
    if (await repository.overlaps(tx, current.id, data.startDate, data.endDate))
      throw new LeaveWorkflowError(
        'ამ თარიღებში უკვე გაქვთ მომლოდინე ან დამტკიცებული მოთხოვნა.',
      )
    const saved = await repository.insert(tx, {
      ...data,
      requesterId: current.id,
    })
    await repository.audit(tx, {
      requestId: saved.id,
      actorId: current.id,
      action: 'created',
      reason: 'მოთხოვნის გაგზავნა',
      before: null,
      after: facts(saved),
    })
    return { id: saved.id }
  })
}
export async function reviewLeave(actor: Actor | null, input: unknown) {
  const data = reviewLeaveSchema.parse(input)
  return repository.transact(async (tx) => {
    const current = await authorize(tx, actor, true, true)
    const found = await repository.requestById(tx, data.id)
    if (!found) throw new LeaveWorkflowError('მოთხოვნა ვერ მოიძებნა.')
    if (found.requesterId === current.id)
      throw new LeaveWorkflowError('საკუთარი მოთხოვნის განხილვა შეუძლებელია.')
    const allowance =
      data.action === 'approved' && found.kind !== 'sick_leave'
        ? await prepareDayOffAllowance(tx)
        : null
    await repository.lockRequester(tx, found.requesterId)
    await authorize(tx, actor, true)
    const request = await repository.requestById(tx, data.id)
    if (
      !request ||
      request.status !== 'pending' ||
      request.revision !== data.revision
    )
      throw new LeaveWorkflowError(
        'მოთხოვნა უკვე შეიცვალა ან განხილულია. განაახლეთ სია და სცადეთ ხელახლა.',
      )
    if (
      data.action === 'modified' &&
      data.startDate === request.startDate &&
      data.endDate === request.endDate
    )
      throw new LeaveWorkflowError('შეცვალეთ თარიღები შენახვამდე.')
    // Request type comes from persistence, never from reviewer-controlled input.
    if (request.kind !== 'sick_leave' && data.endDate === null)
      throw new LeaveWorkflowError('მიუთითეთ დასრულების თარიღი.')
    if (!hasValidLeaveRange({ ...data, kind: request.kind }))
      throw new LeaveWorkflowError('გადაამოწმეთ თარიღების პერიოდი.')
    if (!hasValidDayOffDates({ ...data, kind: request.kind }))
      throw new LeaveWorkflowError(singleDayError)
    if (
      data.action !== 'rejected' &&
      (await repository.overlaps(
        tx,
        request.requesterId,
        data.startDate,
        data.endDate,
        request.id,
      ))
    )
      throw new LeaveWorkflowError(
        'თარიღები ემთხვევა თანამშრომლის სხვა მომლოდინე ან დამტკიცებულ მოთხოვნას.',
      )
    if (allowance && request.kind === 'day_off')
      await consumeDayOff(
        tx,
        allowance,
        request.requesterId,
        current.id,
        request.id,
      )
    const chargedVacationDays =
      allowance && request.kind === 'vacation' && data.endDate !== null
        ? await consumePaidVacation(
            tx,
            allowance,
            request.requesterId,
            current.id,
            request.id,
            data.startDate,
            data.endDate,
          )
        : 0
    const saved = await repository.update(tx, request.id, data.revision, {
      chargedVacationDays,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.action === 'modified' ? 'pending' : data.action,
      reviewerId: current.id,
      reviewReason: data.reason,
      reviewedAt: new Date(),
    })
    if (!saved)
      throw new LeaveWorkflowError('მოთხოვნა შეიცვალა. განაახლეთ სია.')
    await repository.audit(tx, {
      requestId: saved.id,
      actorId: current.id,
      action: data.action,
      reason: data.reason,
      before: facts(request),
      after: facts(saved),
    })
    return { id: saved.id }
  })
}

export async function cancelLeave(actor: Actor | null, input: unknown) {
  const data = cancelLeaveSchema.parse(input)
  return repository.transact(async (tx) => {
    const current = await authorize(tx, actor, false, true)
    // The same lock as submission/review makes cancellation and review mutually exclusive.
    await repository.lockRequester(tx, current.id)
    const request = await repository.requestById(tx, data.id)
    if (!request || request.requesterId !== current.id)
      throw new AuthorizationError()
    if (
      request.status !== 'pending' ||
      request.reviewedAt !== null ||
      request.revision !== data.revision
    )
      throw new LeaveWorkflowError(
        'გაუქმება შეუძლებელია: მოთხოვნა უკვე შეიცვალა ან განხილულია. განაახლეთ სია.',
      )
    const saved = await repository.cancel(
      tx,
      request.id,
      current.id,
      data.revision,
    )
    if (!saved)
      throw new LeaveWorkflowError('მოთხოვნა შეიცვალა. განაახლეთ სია.')
    await repository.audit(tx, {
      requestId: saved.id,
      actorId: current.id,
      action: 'cancelled',
      reason: 'მოთხოვნა გაუქმებულია თანამშრომლის მიერ',
      before: facts(request),
      after: facts(saved),
    })
    return { id: saved.id }
  })
}

/** The requester reports their return date; HR may close on their behalf. This cannot extend a previously approved finite absence. */
export async function closeSickLeave(actor: Actor | null, input: unknown) {
  const data = closeSickLeaveSchema.parse(input)
  return repository.transact(async (tx) => {
    const current = await authorize(tx, actor, false, true)
    const found = await repository.requestById(tx, data.id)
    if (!found) throw new LeaveWorkflowError('ბიულეტენი ვერ მოიძებნა.')
    if (found.requesterId !== current.id) await authorize(tx, actor, true, true)
    await repository.lockRequester(tx, found.requesterId)
    const request = await repository.requestById(tx, data.id)
    if (
      !request ||
      request.kind !== 'sick_leave' ||
      request.endDate !== null ||
      !['pending', 'approved'].includes(request.status) ||
      request.revision !== data.revision
    )
      throw new LeaveWorkflowError(
        'ბიულეტენი უკვე შეიცვალა ან დახურულია. განაახლეთ სია.',
      )
    const today = (await getCompanyWorkday(new Date(), tx)).date
    if (data.endDate < request.startDate || data.endDate > today)
      throw new LeaveWorkflowError(
        'დასრულება უნდა იყოს დაწყების თარიღსა და დღევანდელ თარიღს შორის.',
      )
    const saved = await repository.closeSick(
      tx,
      request.id,
      data.revision,
      data.endDate,
    )
    if (!saved)
      throw new LeaveWorkflowError('ბიულეტენი შეიცვალა. განაახლეთ სია.')
    await repository.audit(tx, {
      requestId: saved.id,
      actorId: current.id,
      action: 'closed',
      reason: 'ბიულეტენის დასრულების თარიღის დაფიქსირება',
      before: facts(request),
      after: facts(saved),
    })
    return { id: saved.id }
  })
}
