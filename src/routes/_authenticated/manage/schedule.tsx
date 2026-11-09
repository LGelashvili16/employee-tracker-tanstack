import { hasPermission } from '#/lib/authorization/permissions'
import { createFileRoute } from '@tanstack/react-router'
import { WorkSchedulePage } from '#/features/scheduling/pages/work-schedule-page'
import { schedulingContent } from '#/features/scheduling/scheduling.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/schedule')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'attendance.configure' } }),
  head: () =>
    pageHead(
      schedulingContent.manageSchedule.title,
      schedulingContent.manageSchedule.description,
    ),
  component: WorkScheduleRoute,
})

function WorkScheduleRoute() {
  const { actor } = Route.useRouteContext()
  return (
    <WorkSchedulePage
      key={actor.id}
      actorId={actor.id}
      canConfigureLeave={hasPermission(actor, 'leave.configure')}
    />
  )
}
