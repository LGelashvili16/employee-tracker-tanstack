import '@tanstack/react-start/server-only'
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm'
import { db } from '#/db'
import { attendanceAudit, attendanceSession, employee, user } from '#/db/schema'
import type { AttendanceDay } from '../attendance.types'

export type AttendanceTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]
export const transactAttendance = db.transaction.bind(db)

export async function employeeDaySessions(
  tx: AttendanceTransaction,
  employeeId: string,
  date: string,
  page: number,
) {
  return tx
    .select({
      id: attendanceSession.id,
      timezone: attendanceSession.timezone,
      startedAt: attendanceSession.startedAt,
      endedAt: attendanceSession.endedAt,
      originalStartedAt: attendanceSession.originalStartedAt,
      originalEndedAt: attendanceSession.originalEndedAt,
      reviewState: attendanceSession.reviewState,
      // Qualify the correlated ID explicitly: single-table Drizzle projections otherwise unqualify column references.
      corrected: sql<boolean>`exists (select 1 from ${attendanceAudit} where ${attendanceAudit.targetId} = attendance_session.id::text and ${attendanceAudit.action} = 'attendance.corrected')`,
    })
    .from(attendanceSession)
    .where(
      and(
        eq(attendanceSession.employeeId, employeeId),
        eq(attendanceSession.workDate, date),
      ),
    )
    .orderBy(desc(attendanceSession.startedAt), desc(attendanceSession.id))
    .limit(21)
    .offset(page * 20)
}

/** Project only attendance correction details belonging to this authenticated employee. */
export async function employeeCorrections(
  tx: AttendanceTransaction,
  employeeId: string,
  page: number,
) {
  const rows = await tx
    .select({
      id: attendanceAudit.id,
      actorName: user.name,
      reason: attendanceAudit.reason,
      createdAt: attendanceAudit.createdAt,
      workDate: attendanceSession.workDate,
      timezone: attendanceSession.timezone,
      beforeStart: sql<string>`${attendanceAudit.before}->>'startedAt'`,
      beforeEnd: sql<string | null>`${attendanceAudit.before}->>'endedAt'`,
      afterStart: sql<string>`${attendanceAudit.after}->>'startedAt'`,
      afterEnd: sql<string | null>`${attendanceAudit.after}->>'endedAt'`,
    })
    .from(attendanceAudit)
    .innerJoin(
      attendanceSession,
      sql`${attendanceSession.id}::text = ${attendanceAudit.targetId}`,
    )
    .innerJoin(user, eq(user.id, attendanceAudit.actorId))
    .where(
      and(
        eq(attendanceSession.employeeId, employeeId),
        eq(attendanceAudit.action, 'attendance.corrected'),
      ),
    )
    .orderBy(desc(attendanceAudit.createdAt), desc(attendanceAudit.id))
    .limit(21)
    .offset(page * 20)
  return {
    items: rows
      .slice(0, 20)
      .map(({ beforeStart, beforeEnd, afterStart, afterEnd, ...row }) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        before: { startedAt: beforeStart, endedAt: beforeEnd },
        after: { startedAt: afterStart, endedAt: afterEnd },
      })),
    hasMore: rows.length > 20,
  }
}

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
  const scheduled = sql`${attendanceSession.expectedEndAt} > ${attendanceSession.expectedStartAt}`
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
        sql<number>`greatest(0, extract(epoch from (min(${attendanceSession.startedAt}) filter (where ${scheduled}) - min(${attendanceSession.expectedStartAt}) filter (where ${scheduled}))))`.mapWith(
          Number,
        ),
      earlySeconds:
        sql<number>`case when bool_or(${attendanceSession.endedAt} is null) then 0 else greatest(0, extract(epoch from (max(${attendanceSession.expectedEndAt}) filter (where ${scheduled}) - max(${attendanceSession.endedAt}) filter (where ${scheduled})))) end`.mapWith(
          Number,
        ),
      incomplete: sql<boolean>`bool_or(${attendanceSession.endedAt} is null)`,
      earlyStartSeconds:
        sql<number>`greatest(0, extract(epoch from (min(${attendanceSession.expectedStartAt}) filter (where ${scheduled}) - min(${attendanceSession.startedAt}) filter (where ${scheduled}))))`.mapWith(
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
