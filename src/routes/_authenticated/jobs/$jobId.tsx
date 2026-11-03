import { createFileRoute } from '@tanstack/react-router'
import { JobDetailPage } from '#/features/jobs/pages/job-detail-page'
import { jobsContent } from '#/features/jobs/jobs.content'
import { pageHead } from '#/lib/page-head'
import { z } from 'zod'
import { recordIdSchema } from '#/lib/route-schemas'

export const Route = createFileRoute('/_authenticated/jobs/$jobId')({
  params: {
    parse: (params) => z.object({ jobId: recordIdSchema }).parse(params),
  },
  head: () =>
    pageHead(jobsContent.jobDetail.title, jobsContent.jobDetail.description),
  component: JobDetailPage,
})
