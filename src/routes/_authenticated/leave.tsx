import { createFileRoute } from '@tanstack/react-router'
import { LeavePage } from '#/features/leave/pages/leave-page'
import { leaveContent } from '#/features/leave/leave.content'
import { pageHead } from '#/lib/page-head'
import { leaveSearchSchema } from '#/features/leave/leave.schemas'

export const Route = createFileRoute('/_authenticated/leave')({
  validateSearch: leaveSearchSchema,
  head: () =>
    pageHead(leaveContent.leave.title, leaveContent.leave.description),
  component: LeavePage,
})
