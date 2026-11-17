import '@tanstack/react-start/server-only'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { getEmployeeWorkday } from '#/features/scheduling/server/scheduling.service.server'
import { readApprovedLeaveForAttendance } from '#/features/leave/server/leave.service.server'
import {
  checkInSchema,
  checkOutSchema,
  attendanceCorrectionsSchema,
  employeeSessionListSchema,
} from '../attendance.schemas'
import { startOfWorkWeek } from '../attendance.rules'
import * as repository from './attendance.repository.server'
import type { Actor } from '#/lib/authorization/actor'
import type { AttendanceOverview } from '../attendance.types'
import { attendanceSetting } from '#/db/schema'
import {
  authorizeClockAction,
  recordPunch,
} from '#/features/attendance-security/server/attendance-security.service.server'
import type { clockProofSchema } from '#/features/attendance-security/attendance-security.schemas'
import type { ClockSecurityContext } from '#/features/attendance-security/server/attendance-security-context.server'
import type { z } from 'zod'
import { currentActor } from '#/features/attendance-security/server/attendance-security.repository.server'

export async function getAssistedClockState(actor: Actor, userId: string) {
  return repository.transactAttendance(async (tx) => {
    await currentActor(tx, actor, 'attendance.clock.assist')
    if (actor.id === userId) throw new AuthorizationError()
    const employeeId = await activeEmployee(tx, actor, false, userId)
    const workday = await getEmployeeWorkday(new Date(), employeeId, tx)
    const latest = await repository.latestSession(tx, employeeId)
    const open = await repository.openSession(tx, employeeId)
    const leave = await readApprovedLeaveForAttendance(tx, userId, workday.date)
    return {
      lastSessionId: latest?.id ?? null,
      openSessionId: open?.id ?? null,
      workDate: workday.date,
      nonWorking: workday.kind === 'day_off' || Boolean(leave),
    }
  })
}

export class AttendanceWorkflowError extends Error {}
async function activeEmployee(
  tx: repository.AttendanceTransaction,
  actor: Actor | null,
  write: boolean,
  subjectUserId = actor?.id,
) {
  if (!actor) throw new AuthorizationError()
  const { identity, person } = await repository.employeeForActor(
    tx,
    subjectUserId!,
    write,
  )
  if (!identity || identity.state !== 'active' || person?.status === 'inactive')
    throw new AuthorizationError()
  if (!person)
    throw new AttendanceWorkflowError(
      'ანგარიში თანამშრომლის ჩანაწერს არ უკავშირდება.',
    )
  return person.id
}
export async function getAttendanceOverview(
  actor: Actor | null,
): Promise<AttendanceOverview> {
  if (!actor) throw new AuthorizationError()
  return repository.transactAttendance(async (tx) => {
    const employeeId = await activeEmployee(tx, actor, false)
    const now = new Date()
    const workday = await getEmployeeWorkday(now, employeeId, tx)
    const approvedLeave = await readApprovedLeaveForAttendance(
      tx,
      actor.id,
      workday.date,
    )
    const open = await repository.openSession(tx, employeeId)
    const last = await repository.latestSession(tx, employeeId)
    const recent = await repository.attendanceDays(tx, employeeId, now)
    const weekDays = await repository.attendanceDays(
      tx,
      employeeId,
      now,
      startOfWorkWeek(workday.date),
    )
    return {
      serverNow: now.toISOString(),
      workday,
      approvedLeave,
      lastSessionId: last?.id ?? null,
      openSession: open
        ? {
            ...open,
            startedAt: open.startedAt.toISOString(),
            endedAt: open.endedAt?.toISOString() ?? null,
            expectedEndAt: open.expectedEndAt.toISOString(),
            expectedStartAt: open.expectedStartAt.toISOString(),
          }
        : null,
      today: recent.find((day) => day.date === workday.date) ?? null,
      recent,
      week: {
        seconds: weekDays.reduce((sum, day) => sum + day.seconds, 0),
        days: weekDays.length,
        lateSeconds: weekDays.reduce((sum, day) => sum + day.lateSeconds, 0),
        daily: weekDays.map((day) => ({
          date: day.date,
          seconds: day.seconds,
        })),
      },
    }
  })
}
export async function readEmployeeDaySessions(
  actor: Actor | null,
  input: unknown,
) {
  const { date, page } = employeeSessionListSchema.parse(input)
  return repository.transactAttendance(async (tx) => {
    const employeeId = await activeEmployee(tx, actor, false)
    const rows = await repository.employeeDaySessions(
      tx,
      employeeId,
      date,
      page,
    )
    return {
      date,
      serverNow: new Date().toISOString(),
      hasMore: rows.length > 20,
      items: rows.slice(0, 20).map((row) => ({
        ...row,
        startedAt: row.startedAt.toISOString(),
        endedAt: row.endedAt?.toISOString() ?? null,
        originalStartedAt: row.originalStartedAt?.toISOString() ?? null,
        originalEndedAt: row.originalEndedAt?.toISOString() ?? null,
        autoClosedAt: row.autoClosedAt?.toISOString() ?? null,
      })),
    }
  })
}
export async function readEmployeeCorrections(
  actor: Actor | null,
  input: unknown,
) {
  const { page } = attendanceCorrectionsSchema.parse(input)
  return repository.transactAttendance(async (tx) => {
    const employeeId = await activeEmployee(tx, actor, false)
    return repository.employeeCorrections(tx, employeeId, page)
  })
}
export async function checkIn(
  actor: Actor | null,
  input: unknown,
  context?: ClockSecurityContext,
  proof?: z.infer<typeof clockProofSchema>,
) {
  if (!actor) throw new AuthorizationError()
  return repository.transactAttendance(async (tx) => {
    const result = checkInSchema.safeParse(input)
    if (!result.success)
      throw new AttendanceWorkflowError(
        'შესვლის მოთხოვნა არასწორია. განაახლეთ გვერდი.',
      )
    const security = await authorizeClockAction(
      tx,
      actor,
      {
        ...proof,
        intent: {
          kind: 'in',
          data: result.data,
          ...(proof?.intent.targetUserId
            ? {
                targetUserId: proof.intent.targetUserId,
                reason: proof.intent.reason,
              }
            : {}),
        },
      },
      context,
    )
    const subjectUserId = security.intent.targetUserId ?? actor.id
    const employeeId = await activeEmployee(tx, actor, true, subjectUserId)
    const existing = await repository.sessionForRequest(
      tx,
      employeeId,
      result.data.requestId,
    )
    if (existing) return existing
    const latest = await repository.latestSession(tx, employeeId)
    if (
      (latest?.id ?? null) !== result.data.expectedLastSessionId ||
      (await repository.openSession(tx, employeeId))
    )
      throw new AttendanceWorkflowError(
        'დასწრების მდგომარეობა შეიცვალა. განაახლეთ გვერდი.',
      )
    const now = new Date()
    if (latest?.endedAt && now < latest.endedAt)
      throw new AttendanceWorkflowError(
        'დროის აღრიცხვა დროებით მიუწვდომელია. სცადეთ ხელახლა.',
      )
    const workday = await getEmployeeWorkday(now, employeeId, tx)
    const nonWorkingDay = workday.kind === 'day_off'
    if (await repository.workdayLimitReached(tx, employeeId, workday.date))
      throw new AttendanceWorkflowError(
        'ამ სამუშაო დღისთვის 18-საათიანი ჯამური ზღვარი მიღწეულია.',
      )
    const approvedLeave = await readApprovedLeaveForAttendance(
      tx,
      subjectUserId,
      workday.date,
      true,
    )
    if (
      (nonWorkingDay || approvedLeave) &&
      result.data.confirmedNonWorkingDate !== workday.date
    )
      throw new AttendanceWorkflowError(
        approvedLeave?.kind === 'sick_leave'
          ? 'დაადასტურეთ ბიულეტენის დროს მუშაობის დაწყება.'
          : approvedLeave?.kind === 'vacation'
            ? 'დაადასტურეთ შვებულების დროს მუშაობის დაწყება.'
            : approvedLeave?.kind === 'day_off'
              ? 'დაადასტურეთ დასვენების დღეს მუშაობის დაწყება.'
              : 'დაადასტურეთ არასამუშაო დღეს მუშაობის დაწყება.',
      )
    if (
      workday.kind === 'unconfigured' ||
      (!nonWorkingDay && (!workday.startsAt || !workday.endsAt)) ||
      !workday.effectiveFrom
    )
      throw new AttendanceWorkflowError(
        'დღეს სამუშაო განრიგი არ არის განსაზღვრული.',
      )
    const created = await repository.insertSession(tx, {
      employeeId,
      requestId: result.data.requestId,
      workDate: workday.date,
      timezone: workday.timezone,
      scheduleEffectiveFrom: workday.effectiveFrom,
      // An empty expected interval retains the absence of scheduled hours.
      // Every actual second is outside schedule and remains subject to review.
      expectedStartAt: nonWorkingDay ? now : new Date(workday.startsAt!),
      expectedEndAt: nonWorkingDay ? now : new Date(workday.endsAt!),
      startedAt: now,
      originalStartedAt: now,
      maxOpenHours:
        (
          await tx
            .select({ hours: attendanceSetting.maxOpenHours })
            .from(attendanceSetting)
            .limit(1)
        ).at(0)?.hours ?? 16,
    })
    if (!created)
      throw new AttendanceWorkflowError(
        'შესვლა ვერ დაფიქსირდა. სცადეთ ხელახლა.',
      )
    await recordPunch(
      tx,
      {
        sessionId: created.id,
        employeeId,
        subjectUserId,
        actorId: actor.id,
        kind: 'in',
        source: security.intent.targetUserId ? 'hr' : 'employee',
        occurredAt: now,
        ip: security.ip,
        deviceId: security.deviceId,
        credentialId: security.credentialId,
        userVerified: security.userVerified,
        reason: security.intent.reason,
      },
      security.networkExemption,
    )
    return created
  })
}
export async function checkOut(
  actor: Actor | null,
  input: unknown,
  context?: ClockSecurityContext,
  proof?: z.infer<typeof clockProofSchema>,
) {
  if (!actor) throw new AuthorizationError()
  return repository.transactAttendance(async (tx) => {
    const result = checkOutSchema.safeParse(input)
    if (!result.success)
      throw new AttendanceWorkflowError('გასვლის მოთხოვნა არასწორია.')
    const security = await authorizeClockAction(
      tx,
      actor,
      {
        ...proof,
        intent: {
          kind: 'out',
          data: result.data,
          ...(proof?.intent.targetUserId
            ? {
                targetUserId: proof.intent.targetUserId,
                reason: proof.intent.reason,
              }
            : {}),
        },
      },
      context,
    )
    const subjectUserId = security.intent.targetUserId ?? actor.id
    const employeeId = await activeEmployee(tx, actor, true, subjectUserId)
    const open = await repository.openSession(tx, employeeId)
    if (!open || open.id !== result.data.sessionId)
      throw new AttendanceWorkflowError(
        'ღია სამუშაო ჩანაწერი ვერ მოიძებნა. განაახლეთ გვერდი.',
      )
    const now = new Date()
    if (
      await repository.automaticCheckoutDue(
        tx,
        employeeId,
        open.workDate,
        open.startedAt,
        now,
      )
    )
      throw new AttendanceWorkflowError(
        'სესიის ავტომატური დასრულება მიმდინარეობს. განაახლეთ გვერდი.',
      )
    if (now < open.expectedEndAt && !result.data.confirmEarly)
      throw new AttendanceWorkflowError(
        'დაადასტურეთ სამუშაო დღის ადრე დასრულება.',
      )
    const records = await repository.endSession(tx, employeeId, open.id, now)
    if (records.length !== 1)
      throw new AttendanceWorkflowError(
        'გასვლა ვერ დაფიქსირდა. განაახლეთ გვერდი.',
      )
    await recordPunch(
      tx,
      {
        sessionId: open.id,
        employeeId,
        subjectUserId,
        actorId: actor.id,
        kind: 'out',
        source: security.intent.targetUserId ? 'hr' : 'employee',
        occurredAt: now,
        ip: security.ip,
        deviceId: security.deviceId,
        credentialId: security.credentialId,
        userVerified: security.userVerified,
        reason: security.intent.reason,
      },
      security.networkExemption,
    )
    return { id: open.id }
  })
}
