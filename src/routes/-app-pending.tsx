import { useRouterState } from '@tanstack/react-router'
import { AppShellSkeleton } from '#/components/layout/app-shell-skeleton'
import { PageSkeleton } from '#/components/common/page-skeleton'
import { AttendanceOverviewSkeleton } from '#/features/attendance/components/attendance-overview-skeleton'

export function AppPending() {
  const { authenticated, dashboard } = useRouterState({
    select: (state) => ({
      authenticated: state.matches.some(
        (match) => match.routeId === '/_authenticated',
      ),
      dashboard: state.location.pathname.replace(/\/$/, '') === '/dashboard',
    }),
  })
  if (!authenticated) return <PageSkeleton />
  return (
    <AppShellSkeleton>
      {dashboard ? (
        <AttendanceOverviewSkeleton dashboardLayout announce={false} />
      ) : (
        <div aria-hidden="true">
          <PageSkeleton announce={false} />
        </div>
      )}
    </AppShellSkeleton>
  )
}
