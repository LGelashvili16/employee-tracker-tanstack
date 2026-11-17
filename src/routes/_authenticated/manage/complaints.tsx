import { createFileRoute } from '@tanstack/react-router'
import { ReviewComplaintsPage } from '#/features/complaints/pages/review-complaints-page'
import { complaintSearchSchema } from '#/features/complaints/complaints.schemas'
import { requirePageAnyPermission } from '#/lib/auth/auth.functions'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/manage/complaints')({
  validateSearch: complaintSearchSchema,
  beforeLoad: () =>
    requirePageAnyPermission({
      data: {
        permissions: ['complaints.review.all', 'complaints.review.assigned'],
      },
    }),
  head: () =>
    pageHead('საჩივრების მართვა', 'თანამშრომელთა საჩივრების განხილვა'),
  component: ReviewComplaintsPage,
})
