import { useJobsRealtime } from '../hooks/use-jobs-realtime'
import { getRouteApi } from '@tanstack/react-router'
import { JobsWorkspace } from '../components/jobs-workspace'

const route = getRouteApi('/_authenticated/jobs/')
export function JobsPage() {
  const { actor } = route.useRouteContext()
  useJobsRealtime(actor.id)
  return <JobsWorkspace actor={actor} search={route.useSearch()} />
}
