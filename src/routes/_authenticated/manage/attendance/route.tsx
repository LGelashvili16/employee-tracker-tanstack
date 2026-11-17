import { useState } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { requirePageAnyPermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/attendance')({
  beforeLoad: () =>
    requirePageAnyPermission({
      data: {
        permissions: [
          'attendance.read.all',
          'attendance.read.team',
          'timesheets.review.team',
        ],
      },
    }),
  component: AttendanceLayout,
})
function AttendanceLayout() {
  const { actor } = Route.useRouteContext()
  return <AttendanceCache key={actor.id} />
}
function AttendanceCache() {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <Outlet />
    </QueryClientProvider>
  )
}
