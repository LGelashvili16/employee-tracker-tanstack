import { createFileRoute } from '@tanstack/react-router'
import { AttendanceHistoryPage } from '#/features/attendance/pages/attendance-history-page'
import { attendanceContent } from '#/features/attendance/attendance.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/attendance/history')({
  head: () =>
    pageHead(
      attendanceContent.attendanceHistory.title,
      attendanceContent.attendanceHistory.description,
    ),
  component: AttendanceHistoryPage,
})
