import { createFileRoute } from '@tanstack/react-router'
import { LeavePage } from '#/features/leave/pages/leave-page'
import { leaveContent } from '#/features/leave/leave.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/leave')({
  head: () =>
    pageHead(leaveContent.leave.title, leaveContent.leave.description),
  component: LeavePage,
})
