import { createFileRoute } from '@tanstack/react-router'
import { AttendancePage } from '#/features/attendance/pages/attendance-page'
import { attendanceContent } from '#/features/attendance/attendance.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/attendance/')({
  head: () =>
    pageHead(
      attendanceContent.attendance.title,
      attendanceContent.attendance.description,
    ),
  component: AttendancePage,
})
