import { createFileRoute } from '@tanstack/react-router'
import { ComplaintsPage } from '#/features/complaints/pages/complaints-page'
import { complaintSearchSchema } from '#/features/complaints/complaints.schemas'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/complaints')({
  validateSearch: complaintSearchSchema,
  head: () => pageHead('საჩივრები', 'პირადი საჩივრები და განხილვის ისტორია'),
  component: ComplaintsPage,
})
