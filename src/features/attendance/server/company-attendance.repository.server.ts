import '@tanstack/react-start/server-only'
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from 'drizzle-orm'
import { attendanceSession, employee, user } from '#/db/schema'
import type { z } from 'zod'
import type {
  companyAttendanceListSchema,
  companyAttendanceUserSchema,
} from '../company-attendance.schemas'
import type { AttendanceTransaction } from './attendance.repository.server'

export const COMPANY_ATTENDANCE_PAGE_SIZE = 20
export const COMPANY_ATTENDANCE_DAYS_PAGE_SIZE = 10

export async function companyAttendanceUsers(
  tx: AttendanceTransaction,
  input: z.infer<typeof companyAttendanceListSchema>,
) {
  // Treat SQL LIKE metacharacters as literal search text.
  const pattern = `%${input.q.replace(/[\\%_]/g, '\\$&')}%`
  const name = sql<string>`coalesce(${employee.fullName}, ${user.name})`
  const code = sql<string>`coalesce(${employee.code}, ${user.username}, '')`
  const where = input.q
    ? or(ilike(name, pattern), ilike(code, pattern))
    : undefined
  const order = input.sort.endsWith('desc') ? desc : asc
  const sortField = input.sort.startsWith('code') ? code : name
  const items = await tx
    .select({
      userId: user.id,
      name,
      code,
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
  input: z.infer<typeof companyAttendanceUserSchema>,
) {
  const subject = (
    await tx
      .select({
        userId: user.id,
        name: sql<string>`coalesce(${employee.fullName}, ${user.name})`,
        code: sql<string>`coalesce(${employee.code}, ${user.username}, '')`,
        employeeId: employee.id,
      })
      .from(user)
      .leftJoin(employee, eq(employee.userId, user.id))
      .where(eq(user.id, input.userId))
      .limit(1)
  ).at(0)
  if (!subject) return null
  if (!subject.employeeId)
    return {
      subject,
      days: [],
      sessions: [],
      totalDays: 0,
      page: input.page,
      pageSize: COMPANY_ATTENDANCE_DAYS_PAGE_SIZE,
    }
  const where = eq(attendanceSession.employeeId, subject.employeeId)
  const order = input.sort === 'date-asc' ? asc : desc
  const [total] = await tx
    .select({ count: countDistinct(attendanceSession.workDate) })
    .from(attendanceSession)
    .where(where)
  // Paginate dates before reading sessions so a day's sessions never straddle pages.
  const days = await tx
    .selectDistinct({ date: attendanceSession.workDate })
    .from(attendanceSession)
    .where(where)
    .orderBy(order(attendanceSession.workDate))
    .limit(COMPANY_ATTENDANCE_DAYS_PAGE_SIZE)
    .offset((input.page - 1) * COMPANY_ATTENDANCE_DAYS_PAGE_SIZE)
  const sessions = days.length
    ? await tx
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
          isFirstOfDay: sql<boolean>`row_number() over (partition by ${attendanceSession.workDate} order by ${attendanceSession.startedAt}, ${attendanceSession.id}) = 1`,
          isLastOfDay: sql<boolean>`row_number() over (partition by ${attendanceSession.workDate} order by ${attendanceSession.startedAt} desc, ${attendanceSession.id} desc) = 1`,
        })
        .from(attendanceSession)
        .where(
          and(
            where,
            inArray(
              attendanceSession.workDate,
              days.map((day) => day.date),
            ),
          ),
        )
        .orderBy(
          order(attendanceSession.workDate),
          order(attendanceSession.startedAt),
          order(attendanceSession.id),
        )
    : []
  return {
    subject,
    days: days.map((day) => day.date),
    sessions,
    totalDays: total.count,
    page: input.page,
    pageSize: COMPANY_ATTENDANCE_DAYS_PAGE_SIZE,
  }
}
