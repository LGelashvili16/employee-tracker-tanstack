import '@tanstack/react-start/server-only'
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm'
import { db } from '#/db'
import {
  attendanceReviewer,
  attendanceSession,
  employee,
  user,
} from '#/db/schema'
import type { z } from 'zod'
import type { timesheetRequestSchema } from '../timesheets.schemas'

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
        permissionOverrides: user.permissionOverrides,
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
  input: z.infer<typeof timesheetRequestSchema>,
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
    input.userId ? eq(employee.userId, input.userId) : undefined,
    input.q
      ? or(
          ilike(employee.fullName, `%${input.q.replace(/[\\%_]/g, '\\$&')}%`),
          ilike(employee.username, `%${input.q.replace(/[\\%_]/g, '\\$&')}%`),
        )
      : undefined,
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
  const days = tx
    .select({
      employeeId: employee.id,
      userId: employee.userId,
      employeeName: employee.fullName,
      date: attendanceSession.workDate,
      timezone: attendanceSession.timezone,
      firstIn: sql<Date>`min(${attendanceSession.startedAt})`
        .mapWith(attendanceSession.startedAt)
        .as('first_in'),
      lastOut: sql<Date | null>`max(${attendanceSession.endedAt})`
        .mapWith((value: string | null) => (value ? new Date(value) : null))
        .as('last_out'),
      seconds: seconds.as('seconds'),
      pending: pending.as('pending'),
      rejected: rejected.as('rejected'),
      open: open.as('open'),
      approvedOutsideSeconds: outside.as('outside_seconds'),
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
    .as('timesheet_days')
  // Filter complete day aggregates so a pending session does not hide other hours from that day.
  const status =
    input.status === 'open'
      ? gt(days.open, 0)
      : input.status === 'pending'
        ? gt(days.pending, 0)
        : input.status === 'rejected'
          ? gt(days.rejected, 0)
          : input.status === 'approved'
            ? and(eq(days.open, 0), eq(days.pending, 0), eq(days.rejected, 0))
            : undefined
  const sort = input.sort ?? 'name-asc'
  const primary =
    sort === 'date-desc'
      ? desc(days.date)
      : sort === 'date-asc'
        ? asc(days.date)
        : sort === 'name-desc'
          ? desc(days.employeeName)
          : sort === 'seconds-desc'
            ? desc(days.seconds)
            : sort === 'seconds-asc'
              ? asc(days.seconds)
              : asc(days.employeeName)
  const rows = await tx
    .select()
    .from(days)
    .where(status)
    .orderBy(
      primary,
      asc(days.employeeName),
      asc(days.employeeId),
      asc(days.date),
      asc(days.timezone),
    )
    .limit(51)
    .offset(input.page * 50)
  const [totals] = await tx
    .select({
      seconds: sql<number>`coalesce(sum(${days.seconds}), 0)`.mapWith(Number),
      pending: sql<number>`coalesce(sum(${days.pending}), 0)`.mapWith(Number),
      rejected: sql<number>`coalesce(sum(${days.rejected}), 0)`.mapWith(Number),
      open: sql<number>`coalesce(sum(${days.open}), 0)`.mapWith(Number),
      approvedOutsideSeconds:
        sql<number>`coalesce(sum(${days.approvedOutsideSeconds}), 0)`.mapWith(
          Number,
        ),
      records: sql<number>`count(*)`.mapWith(Number),
      days: sql<number>`count(distinct (${days.employeeId}, ${days.date}))`.mapWith(
        Number,
      ),
    })
    .from(days)
    .where(status)
  return { rows, totals }
}
