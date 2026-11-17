import { createFileRoute, redirect } from '@tanstack/react-router'
import { JobsPage } from '#/features/jobs/pages/jobs-page'
import { jobsContent } from '#/features/jobs/jobs.content'
import { pageHead } from '#/lib/page-head'
import { jobSearchSchema } from '#/features/jobs/jobs.schemas'

export const Route = createFileRoute('/_authenticated/jobs/')({
  validateSearch: jobSearchSchema,
  beforeLoad: ({ search, location }) => {
    const params = new URLSearchParams(location.searchStr)
    if (!params.has('from') && !params.has('to'))
      throw redirect({ to: '/jobs', search, replace: true })
  },
  head: () => pageHead(jobsContent.jobs.title, jobsContent.jobs.description),
  component: JobsPage,
})
