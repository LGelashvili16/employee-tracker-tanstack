import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FeaturePage } from '#/components/common/feature-page'
import { accountContent } from '../account.content'
import { ProfileOverview } from '../components/profile-overview'

const authenticatedRoute = getRouteApi('/_authenticated')

export function ProfilePage() {
  const { actor } = authenticatedRoute.useRouteContext()
  // The application has no global QueryClient; this page owns its cache and discards it on leaving.
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )
  return (
    <FeaturePage {...accountContent.profile}>
      <QueryClientProvider client={client}>
        <ProfileOverview actor={actor} />
      </QueryClientProvider>
    </FeaturePage>
  )
}
