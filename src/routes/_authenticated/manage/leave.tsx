import { createFileRoute } from '@tanstack/react-router'
import { ReviewLeavePage } from '#/features/leave/pages/review-leave-page'
import { leaveContent } from '#/features/leave/leave.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { leaveSearchSchema } from '#/features/leave/leave.schemas'

export const Route = createFileRoute('/_authenticated/manage/leave')({
  validateSearch: leaveSearchSchema,
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'leave.review' } }),
  head: () =>
    pageHead(
      leaveContent.reviewLeave.title,
      leaveContent.reviewLeave.description,
    ),
  component: ReviewLeavePage,
})
