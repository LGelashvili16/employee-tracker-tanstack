import { createFileRoute } from '@tanstack/react-router'
import { AttendancePage } from '#/features/attendance/pages/attendance-page'
import { attendanceContent } from '#/features/attendance/attendance.content'
import { pageHead } from '#/lib/page-head'
import { attendanceSearchSchema } from '#/features/attendance/attendance.schemas'

export const Route = createFileRoute('/_authenticated/attendance/')({
  validateSearch: attendanceSearchSchema,
  head: () =>
    pageHead(
      attendanceContent.attendance.title,
      attendanceContent.attendance.description,
    ),
  component: AttendanceRoute,
})

function AttendanceRoute() {
  const { actor } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <AttendancePage
      actorId={actor.id}
      correctionsPage={search.correctionsPage}
      onCorrectionsPageChange={(page) => {
        void navigate({
          search: (previous) => ({ ...previous, correctionsPage: page }),
          resetScroll: false,
        })
      }}
    />
  )
}
