import { createFileRoute, redirect } from '@tanstack/react-router'
import { jobsContent } from '#/features/jobs/jobs.content'
import { pageHead } from '#/lib/page-head'
import { z } from 'zod'
import { jobIdSchema } from '#/features/jobs/jobs.schemas'

export const Route = createFileRoute('/_authenticated/jobs/$jobId')({
  params: {
    parse: (params) => z.object({ jobId: jobIdSchema }).parse(params),
  },
  head: () =>
    pageHead(jobsContent.jobDetail.title, jobsContent.jobDetail.description),
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/jobs', search: { pin: params.jobId } })
  },
})
