import { createFileRoute, redirect } from '@tanstack/react-router'
import { jobsContent } from '#/features/jobs/jobs.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { jobSearchSchema } from '#/features/jobs/jobs.schemas'

export const Route = createFileRoute('/_authenticated/manage/jobs/')({
  validateSearch: jobSearchSchema,
  beforeLoad: async ({ search }) => {
    await requirePagePermission({ data: { permission: 'jobs.manage' } })
    throw redirect({ to: '/jobs', search })
  },
  head: () =>
    pageHead(jobsContent.manageJobs.title, jobsContent.manageJobs.description),
})
