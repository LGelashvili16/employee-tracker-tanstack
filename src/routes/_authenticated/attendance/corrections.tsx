import { createFileRoute } from '@tanstack/react-router'
import { AttendanceCorrectionsPage } from '#/features/attendance/pages/attendance-corrections-page'
import { attendanceContent } from '#/features/attendance/attendance.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/attendance/corrections')({
  head: () =>
    pageHead(
      attendanceContent.attendanceCorrections.title,
      attendanceContent.attendanceCorrections.description,
    ),
  component: AttendanceCorrectionsPage,
})
