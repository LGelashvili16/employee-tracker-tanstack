import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '#/features/dashboard/pages/dashboard-page'
import { dashboardContent } from '#/features/dashboard/dashboard.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/dashboard/')({
  head: () =>
    pageHead(
      dashboardContent.dashboard.title,
      dashboardContent.dashboard.description,
    ),
  component: DashboardRoute,
})

function DashboardRoute() {
  const { actor } = Route.useRouteContext()
  return <DashboardPage actorId={actor.id} actorName={actor.name} />
}
