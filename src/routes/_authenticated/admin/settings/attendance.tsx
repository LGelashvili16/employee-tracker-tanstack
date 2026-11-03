import { createFileRoute } from '@tanstack/react-router'
import { AttendanceSettingsPage } from '#/features/attendance/pages/attendance-settings-page'
import { attendanceContent } from '#/features/attendance/attendance.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute(
  '/_authenticated/admin/settings/attendance',
)({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'attendance.configure' } }),
  head: () =>
    pageHead(
      attendanceContent.attendanceSettings.title,
      attendanceContent.attendanceSettings.description,
    ),
  component: AttendanceSettingsPage,
})
