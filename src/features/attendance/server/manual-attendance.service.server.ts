import '@tanstack/react-start/server-only'
import { and, eq, sql } from 'drizzle-orm'
import {
  attendanceSession,
  attendanceSetting,
  employee,
  user,
} from '#/db/schema'
import { assertPermission } from '#/lib/authorization/access'
import { hasPermission } from '#/lib/authorization/permissions'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import type { Actor } from '#/lib/authorization/actor'
import {
  getCompanyWorkday,
  getEmployeeWorkday,
} from '#/features/scheduling/server/scheduling.service.server'
import { deliverNotifications } from '#/features/notifications/server/notifications.service.server'
import { manualAttendanceSchema } from '../attendance.schemas'
import { MAX_WORKDAY_SECONDS } from '../attendance.rules'
import { authorizeAttendanceWorkspace } from './attendance-review.policy.server'
import { transactAttendance } from './attendance.repository.server'
import {
  localAttendanceInstant,
  recordAttendanceAudit,
} from './attendance-review.repository.server'
import { AttendanceWorkflowError } from './attendance.service.server'

/** Administrative entry is audited separately from device-verified employee punches. */
export async function createManualAttendance(
  actor: Actor | null,
  input: unknown,
) {
  const data = manualAttendanceSchema.parse(input)
  return transactAttendance(async (tx) => {
    const access = await authorizeAttendanceWorkspace(tx, actor)
    assertPermission(access.actor, 'attendance.record.manage')
    if (
      !access.company ||
      (data.userId === access.actor.id &&
        !hasPermission(access.actor, 'attendance.correct.self'))
    )
      throw new AuthorizationError()
    const person = (
      await tx
        .select({ id: employee.id })
        .from(employee)
        .innerJoin(user, eq(user.id, employee.userId))
        .where(
          and(
            eq(employee.userId, data.userId),
            eq(employee.status, 'active'),
            eq(user.accessState, 'active'),
          ),
        )
        .for('update')
        .limit(1)
    ).at(0)
    if (!person) throw new AuthorizationError()
    const now = new Date()
    const company = await getCompanyWorkday(now, tx)
    const start = await localAttendanceInstant(tx, data.start, company.timezone)
    const end = data.includeEnd
      ? await localAttendanceInstant(tx, data.end, company.timezone)
      : null
    if (
      !start ||
      start > now ||
      (data.includeEnd && (!end || end <= start || end > now))
    )
      throw new AttendanceWorkflowError(
        'დროის შუალედი არასწორია ან მომავალშია.',
      )
    const existing = (
      await tx
        .select()
        .from(attendanceSession)
        .where(
          and(
            eq(attendanceSession.employeeId, person.id),
            eq(attendanceSession.requestId, data.requestId),
          ),
        )
        .limit(1)
    ).at(0)
    if (existing) {
      if (
        existing.startedAt.getTime() !== start.getTime() ||
        (existing.endedAt?.getTime() ?? null) !== (end?.getTime() ?? null)
      )
        throw new AttendanceWorkflowError(
          'მოთხოვნა უკვე გამოყენებულია. განაახლეთ გვერდი.',
        )
      return { id: existing.id }
    }
    const workday = await getEmployeeWorkday(start, person.id, tx)
    if (
      workday.kind === 'unconfigured' ||
      !workday.effectiveFrom ||
      (workday.kind !== 'day_off' && (!workday.startsAt || !workday.endsAt))
    )
      throw new AttendanceWorkflowError(
        'არჩეული თარიღისთვის სამუშაო განრიგი არ არის განსაზღვრული.',
      )
    const overlap = (
      await tx
        .select({ id: attendanceSession.id })
        .from(attendanceSession)
        .where(
          and(
            eq(attendanceSession.employeeId, person.id),
            sql`${attendanceSession.startedAt} < ${end?.toISOString() ?? 'infinity'}::timestamptz and coalesce(${attendanceSession.endedAt}, 'infinity'::timestamptz) > ${start.toISOString()}::timestamptz`,
          ),
        )
        .limit(1)
    ).at(0)
    if (overlap)
      throw new AttendanceWorkflowError('დროის შუალედი სხვა ჩანაწერს ემთხვევა.')
    const [duration] = await tx
      .select({
        seconds:
          sql<number>`coalesce(sum(extract(epoch from coalesce(${attendanceSession.endedAt}, ${now.toISOString()}::timestamptz) - ${attendanceSession.startedAt})), 0)`.mapWith(
            Number,
          ),
      })
      .from(attendanceSession)
      .where(
        and(
          eq(attendanceSession.employeeId, person.id),
          eq(attendanceSession.workDate, workday.date),
        ),
      )
    if (
      duration.seconds + ((end ?? now).getTime() - start.getTime()) / 1000 >
      MAX_WORKDAY_SECONDS
    )
      throw new AttendanceWorkflowError(
        'ამ სამუშაო დღისთვის 18-საათიანი ჯამური ზღვარი გადაჭარბებულია.',
      )
    const hours =
      (
        await tx
          .select({ hours: attendanceSetting.maxOpenHours })
          .from(attendanceSetting)
          .limit(1)
      ).at(0)?.hours ?? 16
    const createdRows = await tx
      .insert(attendanceSession)
      .values({
        employeeId: person.id,
        requestId: data.requestId,
        workDate: workday.date,
        timezone: workday.timezone,
        scheduleEffectiveFrom: workday.effectiveFrom,
        expectedStartAt: workday.startsAt ? new Date(workday.startsAt) : start,
        expectedEndAt: workday.endsAt ? new Date(workday.endsAt) : start,
        startedAt: start,
        endedAt: end,
        originalStartedAt: start,
        originalEndedAt: end,
        maxOpenHours: hours,
      })
      .returning({ id: attendanceSession.id })
    const created = createdRows.at(0)
    if (!created)
      throw new AttendanceWorkflowError('დასწრება ვერ შეინახა. სცადეთ ხელახლა.')
    await recordAttendanceAudit(
      tx,
      access.actor.id,
      created.id,
      'attendance.created',
      data.reason,
      {},
      { startedAt: start.toISOString(), endedAt: end?.toISOString() ?? null },
    )
    await deliverNotifications(tx, {
      eventKey: `attendance:manual:${created.id}`,
      recipientIds: [data.userId],
      actorId: access.actor.id,
      title: 'დასწრება ხელით აღირიცხა',
      body: 'თქვენს დასწრების ისტორიას ახალი ჩანაწერი დაემატა.',
      destination: {
        kind: 'attendance',
        userId: data.userId,
        workDate: workday.date,
      },
    })
    return created
  })
}
