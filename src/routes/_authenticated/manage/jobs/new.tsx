import { createFileRoute } from '@tanstack/react-router'
import { NewJobPage } from '#/features/jobs/pages/new-job-page'
import { jobsContent } from '#/features/jobs/jobs.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/jobs/new')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'jobs.manage' } }),
  head: () =>
    pageHead(jobsContent.newJob.title, jobsContent.newJob.description),
  component: NewJobPage,
})
