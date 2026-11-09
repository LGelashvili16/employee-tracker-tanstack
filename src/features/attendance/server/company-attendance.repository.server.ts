import '@tanstack/react-start/server-only'
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import {
  attendanceReviewer,
  attendanceSession,
  employee,
  user,
} from '#/db/schema'
import type { z } from 'zod'
import type {
  companyAttendanceListSchema,
  companyAttendanceUserSchema,
} from '../company-attendance.schemas'
import type { AttendanceTransaction } from './attendance.repository.server'

export const COMPANY_ATTENDANCE_PAGE_SIZE = 20

function assignedEmployee(reviewerId: string) {
  return sql<boolean>`${user.id} <> ${reviewerId} and exists (select 1 from ${attendanceReviewer} where ${attendanceReviewer.reviewerId} = ${reviewerId} and ${attendanceReviewer.employeeId} = ${employee.id})`
}

export async function isAssignedReviewer(
  tx: AttendanceTransaction,
  reviewerId: string,
  employeeId: string | null,
) {
  if (!employeeId) return false
  return Boolean(
    (
      await tx
        .select({ employeeId: attendanceReviewer.employeeId })
        .from(attendanceReviewer)
        .where(
          and(
            eq(attendanceReviewer.reviewerId, reviewerId),
            eq(attendanceReviewer.employeeId, employeeId),
          ),
        )
        .limit(1)
    ).length,
  )
}

export async function companyAttendanceUsers(
  tx: AttendanceTransaction,
  input: z.infer<typeof companyAttendanceListSchema>,
  reviewerId?: string,
) {
  // Treat SQL LIKE metacharacters as literal search text.
  const pattern = `%${input.q.replace(/[\\%_]/g, '\\$&')}%`
  const name = sql<string>`coalesce(${employee.fullName}, ${user.name})`
  const username = sql<string>`coalesce(${user.username}, '')`
  const where = and(
    reviewerId ? assignedEmployee(reviewerId) : undefined,
    input.q ? or(ilike(name, pattern), ilike(username, pattern)) : undefined,
    input.state && input.state !== 'all'
      ? eq(user.accessState, input.state)
      : undefined,
  )
  const order = input.sort.endsWith('desc') ? desc : asc
  // Preserve existing code-sort URLs as aliases for the username column.
  const sortField =
    input.sort.startsWith('code') || input.sort.startsWith('username')
      ? username
      : name
  const items = await tx
    .select({
      userId: user.id,
      name,
      username,
      state: user.accessState,
      sessionCount:
        sql<number>`(select count(*) from ${attendanceSession} where ${attendanceSession.employeeId} = ${employee.id})`.mapWith(
          Number,
        ),
    })
    .from(user)
    .leftJoin(employee, eq(employee.userId, user.id))
    .where(where)
    .orderBy(order(sortField), asc(user.id))
    .limit(COMPANY_ATTENDANCE_PAGE_SIZE)
    .offset((input.page - 1) * COMPANY_ATTENDANCE_PAGE_SIZE)
  const [total] = await tx
    .select({ count: count() })
    .from(user)
    .leftJoin(employee, eq(employee.userId, user.id))
    .where(where)
  return {
    items,
    total: total.count,
    page: input.page,
    pageSize: COMPANY_ATTENDANCE_PAGE_SIZE,
  }
}

export async function companyAttendanceUser(
  tx: AttendanceTransaction,
  input: z.infer<typeof companyAttendanceUserSchema> & { date: string },
  reviewerId?: string,
  includeSessions = true,
) {
  const subject = (
    await tx
      .select({
        userId: user.id,
        name: sql<string>`coalesce(${employee.fullName}, ${user.name})`,
        code: sql<string>`coalesce(${employee.username}, ${user.username}, '')`,
        employeeId: employee.id,
        assigned: assignedEmployee(reviewerId ?? ''),
      })
      .from(user)
      .leftJoin(employee, eq(employee.userId, user.id))
      .where(
        and(
          eq(user.id, input.userId),
          reviewerId ? assignedEmployee(reviewerId) : undefined,
        ),
      )
      .limit(1)
  ).at(0)
  if (!subject) return null
  if (!subject.employeeId || !includeSessions) return { subject, sessions: [] }
  // A selected work date is the bounded group; retain every session, including overnight ones.
  const sessions = await tx
    .select({
      id: attendanceSession.id,
      date: attendanceSession.workDate,
      timezone: attendanceSession.timezone,
      startedAt: attendanceSession.startedAt,
      endedAt: attendanceSession.endedAt,
      expectedStartAt: attendanceSession.expectedStartAt,
      expectedEndAt: attendanceSession.expectedEndAt,
      reviewState: attendanceSession.reviewState,
      approvedOutsideSeconds: attendanceSession.approvedOutsideSeconds,
      employeeId: attendanceSession.employeeId,
      revision: attendanceSession.revision,
      maxOpenHours: attendanceSession.maxOpenHours,
      originalStartedAt: attendanceSession.originalStartedAt,
      originalEndedAt: attendanceSession.originalEndedAt,
      isFirstOfDay: sql<boolean>`row_number() over (partition by ${attendanceSession.workDate} order by ${attendanceSession.startedAt}, ${attendanceSession.id}) = 1`,
      isLastOfDay: sql<boolean>`row_number() over (partition by ${attendanceSession.workDate} order by ${attendanceSession.startedAt} desc, ${attendanceSession.id} desc) = 1`,
    })
    .from(attendanceSession)
    .where(
      and(
        eq(attendanceSession.employeeId, subject.employeeId),
        eq(attendanceSession.workDate, input.date),
      ),
    )
    .orderBy(asc(attendanceSession.startedAt), asc(attendanceSession.id))
  return { subject, sessions }
}
