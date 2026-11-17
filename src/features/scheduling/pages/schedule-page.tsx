import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FeaturePage } from '#/components/common/feature-page'
import { OwnScheduleView } from '../components/own-schedule-view'
import { schedulingContent } from '../scheduling.content'

const authenticatedRoute = getRouteApi('/_authenticated')

export function SchedulePage() {
  const { actor } = authenticatedRoute.useRouteContext()
  // The application has no global QueryClient; this page owns its cache and discards it on leaving.
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )
  return (
    <FeaturePage {...schedulingContent.schedule}>
      <QueryClientProvider client={client}>
        <OwnScheduleView actorId={actor.id} />
      </QueryClientProvider>
    </FeaturePage>
  )
}
