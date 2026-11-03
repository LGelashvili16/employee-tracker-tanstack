import { createFileRoute } from '@tanstack/react-router'
import { TeamAttendancePage } from '#/features/attendance/pages/team-attendance-page'
import { attendanceContent } from '#/features/attendance/attendance.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/attendance/')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'attendance.read.team' } }),
  head: () =>
    pageHead(
      attendanceContent.teamAttendance.title,
      attendanceContent.teamAttendance.description,
    ),
  component: TeamAttendancePage,
})
