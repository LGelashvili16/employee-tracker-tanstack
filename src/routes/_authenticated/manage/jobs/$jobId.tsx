import { createFileRoute } from '@tanstack/react-router'
import { ManageJobDetailPage } from '#/features/jobs/pages/manage-job-detail-page'
import { jobsContent } from '#/features/jobs/jobs.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { z } from 'zod'
import { recordIdSchema } from '#/lib/route-schemas'

export const Route = createFileRoute('/_authenticated/manage/jobs/$jobId')({
  params: {
    parse: (params) => z.object({ jobId: recordIdSchema }).parse(params),
  },
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'jobs.manage' } }),
  head: () =>
    pageHead(
      jobsContent.manageJobDetail.title,
      jobsContent.manageJobDetail.description,
    ),
  component: ManageJobDetailPage,
})
