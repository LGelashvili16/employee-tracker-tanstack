import { createFileRoute } from '@tanstack/react-router'
import { ManageSchedulePage } from '#/features/scheduling/pages/manage-schedule-page'
import { schedulingContent } from '#/features/scheduling/scheduling.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/schedule')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'schedule.manage' } }),
  head: () =>
    pageHead(
      schedulingContent.manageSchedule.title,
      schedulingContent.manageSchedule.description,
    ),
  component: ManageSchedulePage,
})
