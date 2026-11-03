import { createFileRoute } from '@tanstack/react-router'
import { JobsPage } from '#/features/jobs/pages/jobs-page'
import { jobsContent } from '#/features/jobs/jobs.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/jobs/')({
  head: () => pageHead(jobsContent.jobs.title, jobsContent.jobs.description),
  component: JobsPage,
})
