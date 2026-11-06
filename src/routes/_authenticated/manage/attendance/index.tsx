import { createFileRoute } from '@tanstack/react-router'
import { TeamAttendancePage } from '#/features/attendance/pages/team-attendance-page'
import { attendanceContent } from '#/features/attendance/attendance.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { attendanceSearchSchema } from '#/features/attendance/attendance.schemas'

export const Route = createFileRoute('/_authenticated/manage/attendance/')({
  validateSearch: attendanceSearchSchema,
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'attendance.read.team' } }),
  head: () =>
    pageHead(
      attendanceContent.teamAttendance.title,
      attendanceContent.teamAttendance.description,
    ),
  component: TeamAttendanceRoute,
})

function TeamAttendanceRoute() {
  const { actor } = Route.useRouteContext()
  const { userId } = Route.useSearch()
  return (
    <TeamAttendancePage
      key={actor.id}
      roles={actor.roles}
      actorId={actor.id}
      userId={userId}
    />
  )
}
