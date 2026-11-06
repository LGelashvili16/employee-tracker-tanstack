import '@tanstack/react-start/server-only'
import { and, desc, eq, ne, sql } from 'drizzle-orm'
import {
  attendanceAudit,
  attendanceReviewer,
  attendanceSession,
  employee,
  user,
} from '#/db/schema'
import type { AttendanceTransaction } from './attendance.repository.server'

/** Explicit assignments constrain reads before pagination, independently from role checks. */
export function reviewerScope(reviewerId: string) {
  return sql`exists (select 1 from ${attendanceReviewer} where ${attendanceReviewer.reviewerId} = ${reviewerId} and ${attendanceReviewer.employeeId} = ${attendanceSession.employeeId})`
}

export async function reviewRows(
  tx: AttendanceTransaction,
  reviewerId: string,
  page: number,
  exceptionsOnly: boolean,
  now: Date,
  userId?: string,
  scope: 'team' | 'company' = 'team',
) {
  return tx
    .select({
      session: attendanceSession,
      employeeName: employee.fullName,
      isFirstOfDay: sql<boolean>`not exists (select 1 from attendance_session other where other.employee_id = ${attendanceSession.employeeId} and other.work_date = ${attendanceSession.workDate} and (other.started_at, other.id) < (${attendanceSession.startedAt}, ${attendanceSession.id}))`,
      isLastOfDay: sql<boolean>`not exists (select 1 from attendance_session other where other.employee_id = ${attendanceSession.employeeId} and other.work_date = ${attendanceSession.workDate} and (other.started_at, other.id) > (${attendanceSession.startedAt}, ${attendanceSession.id}))`,
    })
    .from(attendanceSession)
    .innerJoin(employee, eq(employee.id, attendanceSession.employeeId))
    .where(
      and(
        scope === 'team' ? reviewerScope(reviewerId) : undefined,
        scope === 'team' ? ne(employee.userId, reviewerId) : undefined,
        userId ? eq(employee.userId, userId) : undefined,
        exceptionsOnly
          ? sql`${attendanceSession.reviewState} = 'pending' and (${attendanceSession.endedAt} is not null or ${now}::timestamptz - ${attendanceSession.startedAt} >= ${attendanceSession.maxOpenHours} * interval '1 hour')`
          : undefined,
      ),
    )
    .orderBy(desc(attendanceSession.startedAt), desc(attendanceSession.id))
    .limit(51)
    .offset(page * 50)
}

export async function lockReviewSubject(
  tx: AttendanceTransaction,
  reviewerId: string,
  sessionId: string,
) {
  const target = (
    await tx
      .select({ employeeId: attendanceSession.employeeId })
      .from(attendanceSession)
      .where(
        and(eq(attendanceSession.id, sessionId), reviewerScope(reviewerId)),
      )
      .limit(1)
  ).at(0)
  if (!target) return null
  // Share-lock the assignment so revocation cannot race an authorized review.
  const assignment = (
    await tx
      .select()
      .from(attendanceReviewer)
      .where(
        and(
          eq(attendanceReviewer.reviewerId, reviewerId),
          eq(attendanceReviewer.employeeId, target.employeeId),
        ),
      )
      .for('share')
  ).at(0)
  if (!assignment) return null
  const person = (
    await tx
      .select()
      .from(employee)
      .where(eq(employee.id, target.employeeId))
      .for('update')
  ).at(0)
  if (!person || person.userId === reviewerId) return null
  const record = (
    await tx
      .select()
      .from(attendanceSession)
      .where(eq(attendanceSession.id, sessionId))
      .for('update')
  ).at(0)
  return record ?? null
}

export async function attendanceActor(
  tx: AttendanceTransaction,
  actorId: string,
) {
  const identity = (
    await tx
      .select({ roles: user.roles, state: user.accessState })
      .from(user)
      .where(eq(user.id, actorId))
      .for('share')
  ).at(0)
  const person = (
    await tx
      .select({ status: employee.status })
      .from(employee)
      .where(eq(employee.userId, actorId))
      .for('share')
  ).at(0)
  return { identity, person }
}

export async function recordAttendanceAudit(
  tx: AttendanceTransaction,
  actorId: string,
  targetId: string,
  action: string,
  reason: string,
  before: unknown,
  after: unknown,
) {
  await tx
    .insert(attendanceAudit)
    .values({ actorId, targetId, action, reason, before, after })
}

/** Validate the round trip to reject nonexistent DST wall times. PostgreSQL resolves ambiguous times to standard time, as scheduling does. */
export async function localAttendanceInstant(
  tx: AttendanceTransaction,
  value: string,
  timezone: string,
) {
  const rows = await tx
    .select({
      instant:
        sql<Date>`(${value}::timestamp at time zone ${timezone})`.mapWith(
          attendanceSession.startedAt,
        ),
      valid: sql<boolean>`to_char((${value}::timestamp at time zone ${timezone}) at time zone ${timezone}, 'YYYY-MM-DD"T"HH24:MI') = ${value}`,
    })
    .from(sql`(select 1) as singleton`)
    .limit(1)
  const row = rows.at(0)
  return row?.valid ? row.instant : null
}

export function hasOverlappingSession(
  tx: AttendanceTransaction,
  employeeId: string,
  sessionId: string,
  start: Date,
  end: Date,
) {
  return tx
    .select({ id: attendanceSession.id })
    .from(attendanceSession)
    .where(
      and(
        eq(attendanceSession.employeeId, employeeId),
        ne(attendanceSession.id, sessionId),
        sql`${attendanceSession.startedAt} < ${end} and coalesce(${attendanceSession.endedAt}, 'infinity'::timestamptz) > ${start}`,
      ),
    )
    .limit(1)
}
