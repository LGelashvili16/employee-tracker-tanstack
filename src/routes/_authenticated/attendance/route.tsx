import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { AttendanceNavigation } from '#/features/attendance/components/attendance-navigation'
import { attendanceContent } from '#/features/attendance/attendance.content'

export const Route = createFileRoute('/_authenticated/attendance')({
  component: AttendanceLayout,
})

function AttendanceLayout() {
  const title = useLocation({
    select: (location) =>
      location.pathname.replace(/\/$/, '') === '/attendance/corrections'
        ? attendanceContent.attendanceCorrections.title
        : attendanceContent.attendance.title,
  })
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <AttendanceNavigation>
        <Outlet />
      </AttendanceNavigation>
    </section>
  )
}
