import '@tanstack/react-start/server-only'
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm'
import { db } from '#/db'
import { attendanceSession, employee, user } from '#/db/schema'
import type { AttendanceDay } from '../attendance.types'

export type AttendanceTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]
export const transactAttendance = db.transaction.bind(db)

export async function employeeForActor(
  tx: AttendanceTransaction,
  actorId: string,
  write: boolean,
) {
  const identity = (
    await tx
      .select({ state: user.accessState })
      .from(user)
      .where(eq(user.id, actorId))
      .for('share')
  ).at(0)
  const query = tx
    .select({ id: employee.id, status: employee.status })
    .from(employee)
    .where(eq(employee.userId, actorId))
  const person = (await query.for(write ? 'update' : 'share')).at(0)
  return { identity, person }
}
const sessionProjection = {
  id: attendanceSession.id,
  workDate: attendanceSession.workDate,
  timezone: attendanceSession.timezone,
  startedAt: attendanceSession.startedAt,
  endedAt: attendanceSession.endedAt,
  expectedEndAt: attendanceSession.expectedEndAt,
  expectedStartAt: attendanceSession.expectedStartAt,
  maxOpenHours: attendanceSession.maxOpenHours,
}
export async function latestSession(
  tx: AttendanceTransaction,
  employeeId: string,
) {
  return (
    (
      await tx
        .select(sessionProjection)
        .from(attendanceSession)
        .where(eq(attendanceSession.employeeId, employeeId))
        .orderBy(desc(attendanceSession.startedAt), desc(attendanceSession.id))
        .limit(1)
    ).at(0) ?? null
  )
}
export async function openSession(
  tx: AttendanceTransaction,
  employeeId: string,
) {
  return (
    (
      await tx
        .select(sessionProjection)
        .from(attendanceSession)
        .where(
          and(
            eq(attendanceSession.employeeId, employeeId),
            isNull(attendanceSession.endedAt),
          ),
        )
        .limit(1)
    ).at(0) ?? null
  )
}
export async function sessionForRequest(
  tx: AttendanceTransaction,
  employeeId: string,
  requestId: string,
) {
  return (
    (
      await tx
        .select({ id: attendanceSession.id })
        .from(attendanceSession)
        .where(
          and(
            eq(attendanceSession.employeeId, employeeId),
            eq(attendanceSession.requestId, requestId),
          ),
        )
        .limit(1)
    ).at(0) ?? null
  )
}
export async function insertSession(
  tx: AttendanceTransaction,
  value: typeof attendanceSession.$inferInsert,
) {
  return (
    await tx
      .insert(attendanceSession)
      .values(value)
      .returning({ id: attendanceSession.id })
  ).at(0)
}
export async function endSession(
  tx: AttendanceTransaction,
  employeeId: string,
  sessionId: string,
  now: Date,
) {
  return tx
    .update(attendanceSession)
    .set({
      endedAt: now,
      originalEndedAt: now,
      revision: sql`${attendanceSession.revision} + 1`,
    })
    .where(
      and(
        eq(attendanceSession.id, sessionId),
        eq(attendanceSession.employeeId, employeeId),
        isNull(attendanceSession.endedAt),
        sql`${attendanceSession.startedAt} <= ${now}`,
      ),
    )
    .returning({ id: attendanceSession.id })
}

/** Group only this employee's sessions in SQL; never fetch another employee's attendance for browser filtering. */
export async function attendanceDays(
  tx: AttendanceTransaction,
  employeeId: string,
  now: Date,
  since?: string,
): Promise<Array<AttendanceDay>> {
  const actualEnd = sql`coalesce(${attendanceSession.endedAt}, ${now}::timestamptz)`
  const beforeSchedule = sql`greatest(0, extract(epoch from (least(${actualEnd}, ${attendanceSession.expectedStartAt}) - ${attendanceSession.startedAt})))`
  const afterSchedule = sql`greatest(0, extract(epoch from (${actualEnd} - greatest(${attendanceSession.startedAt}, ${attendanceSession.expectedEndAt}))))`
  const rows = await tx
    .select({
      date: attendanceSession.workDate,
      timezone: sql<string>`min(${attendanceSession.timezone})`,
      firstIn: sql<Date>`min(${attendanceSession.startedAt})`.mapWith(
        attendanceSession.startedAt,
      ),
      lastOut: sql<Date>`max(${attendanceSession.endedAt})`.mapWith(
        (value: string | null) => (value === null ? null : new Date(value)),
      ),
      seconds:
        sql<number>`sum(greatest(0, extract(epoch from (coalesce(${attendanceSession.endedAt}, ${now}::timestamptz) - ${attendanceSession.startedAt}))))`.mapWith(
          Number,
        ),
      lateSeconds:
        sql<number>`greatest(0, extract(epoch from (min(${attendanceSession.startedAt}) - min(${attendanceSession.expectedStartAt}))))`.mapWith(
          Number,
        ),
      earlySeconds:
        sql<number>`case when bool_or(${attendanceSession.endedAt} is null) then 0 else greatest(0, extract(epoch from (max(${attendanceSession.expectedEndAt}) - max(${attendanceSession.endedAt})))) end`.mapWith(
          Number,
        ),
      incomplete: sql<boolean>`bool_or(${attendanceSession.endedAt} is null)`,
      earlyStartSeconds:
        sql<number>`greatest(0, extract(epoch from (min(${attendanceSession.expectedStartAt}) - min(${attendanceSession.startedAt}))))`.mapWith(
          Number,
        ),
      outsideSeconds:
        sql<number>`sum(${beforeSchedule} + ${afterSchedule})`.mapWith(Number),
      approvedOutsideSeconds:
        sql<number>`sum(${attendanceSession.approvedOutsideSeconds})`.mapWith(
          Number,
        ),
      pendingReviews:
        sql<number>`count(*) filter (where ${attendanceSession.reviewState} = 'pending' and ${attendanceSession.endedAt} is not null)`.mapWith(
          Number,
        ),
      rejectedReviews:
        sql<number>`count(*) filter (where ${attendanceSession.reviewState} = 'rejected')`.mapWith(
          Number,
        ),
      requiresReview: sql<boolean>`bool_or(${attendanceSession.endedAt} is null and ${now}::timestamptz - ${attendanceSession.startedAt} >= ${attendanceSession.maxOpenHours} * interval '1 hour')`,
      corrected: sql<boolean>`bool_or((${attendanceSession.originalStartedAt} is not null and ${attendanceSession.originalStartedAt} <> ${attendanceSession.startedAt}) or (${attendanceSession.endedAt} is not null and (${attendanceSession.originalEndedAt} is null or ${attendanceSession.originalEndedAt} <> ${attendanceSession.endedAt})))`,
    })
    .from(attendanceSession)
    .where(
      and(
        eq(attendanceSession.employeeId, employeeId),
        since ? gte(attendanceSession.workDate, since) : undefined,
      ),
    )
    .groupBy(attendanceSession.workDate)
    .orderBy(desc(attendanceSession.workDate))
    .limit(since ? 8 : 5)
  return rows.map((row) => ({
    ...row,
    firstIn: row.firstIn.toISOString(),
    lastOut: row.incomplete || !row.lastOut ? null : row.lastOut.toISOString(),
    seconds: Math.floor(row.seconds),
    lateSeconds: Math.ceil(row.lateSeconds),
    earlySeconds: Math.ceil(row.earlySeconds),
    earlyStartSeconds: Math.ceil(row.earlyStartSeconds),
    outsideSeconds: Math.floor(row.outsideSeconds),
  }))
}
