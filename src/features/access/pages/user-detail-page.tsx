import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserDetail } from '../components/user-detail'

const route = getRouteApi('/_authenticated/manage/employees/$employeeId')

export function UserDetailPage() {
  const { employeeId: userId } = route.useParams()
  const { actor } = route.useRouteContext()
  // This private feature owns its cache; leaving the authenticated page discards it.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <UserDetail userId={userId} actor={actor} />
    </QueryClientProvider>
  )
}
