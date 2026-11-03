import { createFileRoute } from '@tanstack/react-router'
import { SchedulePage } from '#/features/scheduling/pages/schedule-page'
import { schedulingContent } from '#/features/scheduling/scheduling.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/schedule')({
  head: () =>
    pageHead(
      schedulingContent.schedule.title,
      schedulingContent.schedule.description,
    ),
  component: SchedulePage,
})
