import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AttendanceNavigation } from '#/features/attendance/components/attendance-navigation'

export const Route = createFileRoute('/_authenticated/attendance')({
  component: AttendanceLayout,
})

function AttendanceLayout() {
  return (
    <AttendanceNavigation>
      <Outlet />
    </AttendanceNavigation>
  )
}
