import { createFileRoute, redirect } from '@tanstack/react-router'
import { jobsContent } from '#/features/jobs/jobs.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { z } from 'zod'
import { jobIdSchema } from '#/features/jobs/jobs.schemas'

export const Route = createFileRoute('/_authenticated/manage/jobs/$jobId')({
  params: {
    parse: (params) => z.object({ jobId: jobIdSchema }).parse(params),
  },
  beforeLoad: async ({ params }) => {
    await requirePagePermission({ data: { permission: 'jobs.manage' } })
    throw redirect({ to: '/jobs', search: { pin: params.jobId } })
  },
  head: () =>
    pageHead(
      jobsContent.manageJobDetail.title,
      jobsContent.manageJobDetail.description,
    ),
})
