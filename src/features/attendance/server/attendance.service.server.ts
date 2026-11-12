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

export class AttendanceWorkflowError extends Error {}
async function activeEmployee(
  tx: repository.AttendanceTransaction,
  actor: Actor | null,
  write: boolean,
) {
  if (!actor) throw new AuthorizationError()
  const { identity, person } = await repository.employeeForActor(
    tx,
    actor.id,
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
export async function checkIn(actor: Actor | null, input: unknown) {
  if (!actor) throw new AuthorizationError()
  return repository.transactAttendance(async (tx) => {
    const employeeId = await activeEmployee(tx, actor, true)
    const result = checkInSchema.safeParse(input)
    if (!result.success)
      throw new AttendanceWorkflowError(
        'შესვლის მოთხოვნა არასწორია. განაახლეთ გვერდი.',
      )
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
    const approvedLeave = await readApprovedLeaveForAttendance(
      tx,
      actor.id,
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
    return created
  })
}
export async function checkOut(actor: Actor | null, input: unknown) {
  return repository.transactAttendance(async (tx) => {
    const employeeId = await activeEmployee(tx, actor, true)
    const result = checkOutSchema.safeParse(input)
    if (!result.success)
      throw new AttendanceWorkflowError('გასვლის მოთხოვნა არასწორია.')
    const open = await repository.openSession(tx, employeeId)
    if (!open || open.id !== result.data.sessionId)
      throw new AttendanceWorkflowError(
        'ღია სამუშაო ჩანაწერი ვერ მოიძებნა. განაახლეთ გვერდი.',
      )
    const now = new Date()
    if (now < open.expectedEndAt && !result.data.confirmEarly)
      throw new AttendanceWorkflowError(
        'დაადასტურეთ სამუშაო დღის ადრე დასრულება.',
      )
    const records = await repository.endSession(tx, employeeId, open.id, now)
    if (records.length !== 1)
      throw new AttendanceWorkflowError(
        'გასვლა ვერ დაფიქსირდა. განაახლეთ გვერდი.',
      )
    return { id: open.id }
  })
}
