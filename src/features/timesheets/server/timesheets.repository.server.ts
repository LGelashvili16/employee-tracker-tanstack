import '@tanstack/react-start/server-only'
import { and, asc, eq, gte, lt, ne, sql } from 'drizzle-orm'
import { db } from '#/db'
import {
  attendanceReviewer,
  attendanceSession,
  employee,
  user,
} from '#/db/schema'

export const transactTimesheets = db.transaction.bind(db)
export type TimesheetTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

export async function currentTimesheetActor(
  tx: TimesheetTransaction,
  actorId: string,
) {
  return (
    await tx
      .select({
        roles: user.roles,
        state: user.accessState,
        employmentStatus: employee.status,
      })
      .from(user)
      .leftJoin(employee, eq(employee.userId, user.id))
      .where(eq(user.id, actorId))
      .limit(1)
  ).at(0)
}

export async function readPeriod(
  tx: TimesheetTransaction,
  actorId: string,
  scope: 'self' | 'team' | 'company',
  start: string,
  end: string,
  page: number,
  userId: string | undefined,
  now: Date,
) {
  const condition = and(
    scope === 'company'
      ? undefined
      : scope === 'self'
        ? eq(employee.userId, actorId)
        : and(
            ne(employee.userId, actorId),
            sql`exists (select 1 from ${attendanceReviewer} where ${attendanceReviewer.reviewerId} = ${actorId} and ${attendanceReviewer.employeeId} = ${attendanceSession.employeeId})`,
          ),
    userId ? eq(employee.userId, userId) : undefined,
    gte(attendanceSession.workDate, start),
    lt(attendanceSession.workDate, end),
  )
  // Month membership follows the retained work date, including time worked after midnight.
  const seconds =
    sql<number>`coalesce(sum(greatest(0, floor(extract(epoch from (coalesce(${attendanceSession.endedAt}, ${now}::timestamptz) - ${attendanceSession.startedAt}))))), 0)`.mapWith(
      Number,
    )
  const pending =
    sql<number>`count(*) filter (where ${attendanceSession.reviewState} = 'pending' and ${attendanceSession.endedAt} is not null)`.mapWith(
      Number,
    )
  const rejected =
    sql<number>`count(*) filter (where ${attendanceSession.reviewState} = 'rejected')`.mapWith(
      Number,
    )
  const open =
    sql<number>`count(*) filter (where ${attendanceSession.endedAt} is null)`.mapWith(
      Number,
    )
  const outside =
    sql<number>`coalesce(sum(${attendanceSession.approvedOutsideSeconds}), 0)`.mapWith(
      Number,
    )
  const rows = await tx
    .select({
      employeeId: employee.id,
      userId: employee.userId,
      employeeName: employee.fullName,
      date: attendanceSession.workDate,
      timezone: attendanceSession.timezone,
      firstIn: sql<Date>`min(${attendanceSession.startedAt})`.mapWith(
        attendanceSession.startedAt,
      ),
      lastOut: sql<Date | null>`max(${attendanceSession.endedAt})`.mapWith(
        (value: string | null) => (value ? new Date(value) : null),
      ),
      seconds,
      pending,
      rejected,
      open,
      approvedOutsideSeconds: outside,
    })
    .from(attendanceSession)
    .innerJoin(employee, eq(employee.id, attendanceSession.employeeId))
    .where(condition)
    .groupBy(
      employee.id,
      employee.userId,
      employee.fullName,
      attendanceSession.workDate,
      attendanceSession.timezone,
    )
    .orderBy(
      asc(employee.fullName),
      asc(employee.userId),
      asc(attendanceSession.workDate),
      asc(attendanceSession.timezone),
    )
    .limit(51)
    .offset(page * 50)
  const [totals] = await tx
    .select({
      seconds,
      pending,
      rejected,
      open,
      approvedOutsideSeconds: outside,
      days: sql<number>`count(distinct (${attendanceSession.employeeId}, ${attendanceSession.workDate}))`.mapWith(
        Number,
      ),
    })
    .from(attendanceSession)
    .innerJoin(employee, eq(employee.id, attendanceSession.employeeId))
    .where(condition)
  return { rows, totals }
}
