import { createFileRoute } from '@tanstack/react-router'
import { AttendanceExceptionsPage } from '#/features/attendance/pages/attendance-exceptions-page'
import { attendanceContent } from '#/features/attendance/attendance.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute(
  '/_authenticated/manage/attendance/exceptions',
)({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'attendance.review.team' } }),
  head: () =>
    pageHead(
      attendanceContent.attendanceExceptions.title,
      attendanceContent.attendanceExceptions.description,
    ),
  component: AttendanceExceptionsPage,
})
