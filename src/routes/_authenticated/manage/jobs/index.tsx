import { createFileRoute } from '@tanstack/react-router'
import { ManageJobsPage } from '#/features/jobs/pages/manage-jobs-page'
import { jobsContent } from '#/features/jobs/jobs.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/jobs/')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'jobs.manage' } }),
  head: () =>
    pageHead(jobsContent.manageJobs.title, jobsContent.manageJobs.description),
  component: ManageJobsPage,
})
