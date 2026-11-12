import { deliverNotifications } from '#/features/notifications/server/notifications.service.server'
import '@tanstack/react-start/server-only'
import { and, eq, sql } from 'drizzle-orm'
import { attendanceAudit, attendanceSession, employee, user } from '#/db/schema'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { hasPermission } from '#/lib/authorization/permissions'
import { assertPermission } from '#/lib/authorization/access'
import type { Actor } from '#/lib/authorization/actor'
import {
  attendanceCorrectionSchema,
  attendanceHistorySchema,
  attendanceListSchema,
  attendanceReviewSchema,
} from '../attendance.schemas'
import { formatAttendanceLocalInput, sessionMetrics } from '../attendance.rules'
import type { ReviewSession } from '../attendance.types'
import { companyLocalDate } from '#/features/scheduling/scheduling.rules'
import { AttendanceWorkflowError } from './attendance.service.server'
import { transactAttendance } from './attendance.repository.server'
import {
  authorizeAttendance,
  authorizeAttendanceWorkspace,
} from './attendance-review.policy.server'
import * as repository from './attendance-review.repository.server'

export async function listAttendanceForReview(
  actor: Actor | null,
  input: unknown,
  scope: 'team' | 'company' = 'team',
) {
  const { page, exceptionsOnly, userId } = attendanceListSchema.parse(input)
  return transactAttendance(async (tx) => {
    const current = await authorizeAttendance(
      tx,
      actor,
      scope === 'company' ? 'attendance.read.all' : 'attendance.read.team',
    )
    if (scope === 'company') assertPermission(current, 'manage.access')
    const now = new Date()
    const rows = await repository.reviewRows(
      tx,
      current.id,
      page,
      exceptionsOnly,
      now,
      userId,
      scope,
    )
    const items: Array<ReviewSession> = rows
      .slice(0, 50)
      .map(
        ({
          session,
          employeeName,
          subjectUserId,
          isFirstOfDay,
          isLastOfDay,
        }) => ({
          isFirstOfDay,
          isLastOfDay,
          id: session.id,
          employeeId: session.employeeId,
          employeeName,
          workDate: session.workDate,
          timezone: session.timezone,
          startedAt: session.startedAt.toISOString(),
          endedAt: session.endedAt?.toISOString() ?? null,
          expectedStartAt: session.expectedStartAt.toISOString(),
          expectedEndAt: session.expectedEndAt.toISOString(),
          originalStartedAt: session.originalStartedAt?.toISOString() ?? null,
          originalEndedAt: session.originalEndedAt?.toISOString() ?? null,
          reviewState: session.reviewState,
          revision: session.revision,
          approvedOutsideSeconds: session.approvedOutsideSeconds,
          maxOpenHours: session.maxOpenHours,
          canReview:
            scope === 'team' &&
            hasPermission(current, 'attendance.review.team'),
          canCorrect:
            subjectUserId !== current.id &&
            (hasPermission(current, 'attendance.correct.all') ||
              (scope === 'team' &&
                hasPermission(current, 'attendance.review.team'))),
        }),
      )
    return { items, hasMore: rows.length > 50, serverNow: now.toISOString() }
  })
}

export async function attendanceReviewHistory(
  actor: Actor | null,
  input: unknown,
) {
  const { sessionId } = attendanceHistorySchema.parse(input)
  return transactAttendance(async (tx) => {
    const access = await authorizeAttendanceWorkspace(tx, actor)
    const current = access.actor
    const companyCorrection =
      access.company && hasPermission(current, 'attendance.correct.all')
    if (!companyCorrection) assertPermission(current, 'attendance.read.team')
    const records = await tx
      .select({ id: attendanceSession.id })
      .from(attendanceSession)
      .innerJoin(employee, eq(employee.id, attendanceSession.employeeId))
      .where(
        and(
          eq(attendanceSession.id, sessionId),
          companyCorrection ? undefined : repository.reviewerScope(current.id),
          sql`${employee.userId} <> ${current.id}`,
        ),
      )
      .limit(1)
    const record = records.at(0)
    if (!record) throw new AuthorizationError()
    const items = await tx
      .select({
        id: attendanceAudit.id,
        actorName: user.name,
        action: attendanceAudit.action,
        reason: attendanceAudit.reason,
        createdAt: attendanceAudit.createdAt,
      })
      .from(attendanceAudit)
      .innerJoin(user, eq(user.id, attendanceAudit.actorId))
      .where(eq(attendanceAudit.targetId, sessionId))
      .orderBy(
        sql`${attendanceAudit.createdAt} desc`,
        sql`${attendanceAudit.id} desc`,
      )
      .limit(21)
    return {
      items: items
        .slice(0, 20)
        .map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      hasMore: items.length > 20,
    }
  })
}

function checkVersion(
  record: typeof attendanceSession.$inferSelect,
  revision: number,
) {
  if (record.revision !== revision)
    throw new AttendanceWorkflowError(
      'ჩანაწერი შეიცვალა. განაახლეთ მონაცემები და სცადეთ ხელახლა.',
    )
}
function auditState(record: typeof attendanceSession.$inferSelect) {
  return {
    startedAt: record.startedAt.toISOString(),
    endedAt: record.endedAt?.toISOString() ?? null,
    workDate: record.workDate,
    revision: record.revision,
    reviewState: record.reviewState,
    approvedOutsideSeconds: record.approvedOutsideSeconds,
  }
}

export async function reviewAttendance(actor: Actor | null, input: unknown) {
  const data = attendanceReviewSchema.parse(input)
  return transactAttendance(async (tx) => {
    const current = await authorizeAttendance(
      tx,
      actor,
      'attendance.review.team',
    )
    const record = await repository.lockReviewSubject(
      tx,
      current.id,
      data.sessionId,
    )
    if (!record) throw new AuthorizationError()
    checkVersion(record, data.revision)
    if (!record.endedAt || record.reviewState !== 'pending')
      throw new AttendanceWorkflowError(
        'გადახედვა შესაძლებელია მხოლოდ დასრულებულ, განსახილველ ჩანაწერზე.',
      )
    const metrics = sessionMetrics(
      record.startedAt.toISOString(),
      record.endedAt.toISOString(),
      record.expectedStartAt.toISOString(),
      record.expectedEndAt.toISOString(),
      new Date().toISOString(),
    )
    const reviewState = data.decision === 'approve' ? 'approved' : 'rejected'
    const approvedOutsideSeconds =
      data.decision === 'approve' && data.approveOutside
        ? metrics.outsideSeconds
        : 0
    const updates = await tx
      .update(attendanceSession)
      .set({
        reviewState,
        approvedOutsideSeconds,
        revision: record.revision + 1,
      })
      .where(eq(attendanceSession.id, record.id))
      .returning()
    const updated = updates.at(0)
    if (!updated) throw new AttendanceWorkflowError('ჩანაწერი ვერ განახლდა.')
    await repository.recordAttendanceAudit(
      tx,
      current.id,
      record.id,
      `attendance.${reviewState}`,
      data.reason,
      auditState(record),
      auditState(updated),
    )
    const recipientId = await repository.notificationSubject(
      tx,
      record.employeeId,
    )
    if (recipientId)
      await deliverNotifications(tx, {
        eventKey: `attendance:${record.id}:${updated.revision}`,
        recipientIds: [recipientId],
        actorId: current.id,
        title: 'დასწრების ჩანაწერი განხილულია',
        body: `${reviewState === 'approved' ? 'ჩანაწერი დამტკიცდა.' : 'ჩანაწერი უარყოფილია.'} ${data.decision === 'approve' && metrics.outsideSeconds > 0 ? (data.approveOutside ? 'არასამუშაო საათები დამტკიცდა.' : 'არასამუშაო საათები არ დამტკიცდა.') : ''} ${data.reason}`,
        destination: {
          kind: 'attendance',
          userId: recipientId,
          workDate: record.workDate,
        },
      })
    return { id: record.id }
  })
}

export async function correctAttendance(actor: Actor | null, input: unknown) {
  const data = attendanceCorrectionSchema.parse(input)
  return transactAttendance(async (tx) => {
    const access = await authorizeAttendanceWorkspace(tx, actor)
    const companyCorrection =
      access.company && hasPermission(access.actor, 'attendance.correct.all')
    const current = companyCorrection
      ? access.actor
      : await authorizeAttendance(tx, actor, 'attendance.review.team')
    const record = await repository.lockReviewSubject(
      tx,
      current.id,
      data.sessionId,
      companyCorrection ? 'company' : 'team',
    )
    if (!record) throw new AuthorizationError()
    checkVersion(record, data.revision)
    // A minute-precision form must not silently round unchanged original punches.
    const start =
      data.start ===
      formatAttendanceLocalInput(
        record.startedAt.toISOString(),
        record.timezone,
      )
        ? record.startedAt
        : await repository.localAttendanceInstant(
            tx,
            data.start,
            record.timezone,
          )
    const end =
      record.endedAt &&
      data.end ===
        formatAttendanceLocalInput(
          record.endedAt.toISOString(),
          record.timezone,
        )
        ? record.endedAt
        : await repository.localAttendanceInstant(tx, data.end, record.timezone)
    if (!start || !end || end <= start || end > new Date())
      throw new AttendanceWorkflowError(
        'დროის შუალედი არასწორია ან მომავალშია.',
      )
    // Keep the original workday and schedule immutable. Moving attendance to another day needs a separate reviewed workflow.
    if (companyLocalDate(start, record.timezone) !== record.workDate)
      throw new AttendanceWorkflowError(
        'დაწყება უნდა დარჩეს ჩანაწერის სამუშაო თარიღზე.',
      )
    if (
      (
        await repository.hasOverlappingSession(
          tx,
          record.employeeId,
          record.id,
          start,
          end,
        )
      ).length
    )
      throw new AttendanceWorkflowError('დროის შუალედი სხვა ჩანაწერს ემთხვევა.')
    if (
      start.getTime() === record.startedAt.getTime() &&
      end.getTime() === record.endedAt?.getTime()
    )
      return { id: record.id }
    const updates = await tx
      .update(attendanceSession)
      .set({
        startedAt: start,
        endedAt: end,
        reviewState: 'pending',
        approvedOutsideSeconds: 0,
        revision: record.revision + 1,
      })
      .where(eq(attendanceSession.id, record.id))
      .returning()
    const updated = updates.at(0)
    if (!updated) throw new AttendanceWorkflowError('ჩანაწერი ვერ განახლდა.')
    await repository.recordAttendanceAudit(
      tx,
      current.id,
      record.id,
      'attendance.corrected',
      data.reason,
      auditState(record),
      auditState(updated),
    )
    const recipientId = await repository.notificationSubject(
      tx,
      record.employeeId,
    )
    if (recipientId)
      await deliverNotifications(tx, {
        eventKey: `attendance:${record.id}:${updated.revision}`,
        recipientIds: [recipientId],
        actorId: current.id,
        title: 'დასწრების ჩანაწერი შესწორდა',
        body: `შესვლა: ${formatAttendanceLocalInput(record.startedAt.toISOString(), record.timezone).replace('T', ' ')} → ${formatAttendanceLocalInput(start.toISOString(), record.timezone).replace('T', ' ')}. გასვლა: ${record.endedAt ? formatAttendanceLocalInput(record.endedAt.toISOString(), record.timezone).replace('T', ' ') : 'არ იყო აღრიცხული'} → ${formatAttendanceLocalInput(end.toISOString(), record.timezone).replace('T', ' ')}. ${data.reason}`,
        destination: {
          kind: 'attendance',
          userId: recipientId,
          workDate: record.workDate,
        },
      })
    return { id: record.id }
  })
}

export {
  assignAttendanceReviewer,
  readAttendanceConfiguration,
  saveAttendanceLimit,
} from './attendance-configuration.service.server'
