import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EmployeeAccounts } from '../components/employee-accounts'
import type { Actor } from '#/lib/authorization/actor'

export function UsersPage({
  page,
  onPageChange,
  actor,
}: {
  page: number
  onPageChange: (page: number) => void
  actor: Actor
}) {
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
      <EmployeeAccounts page={page} onPageChange={onPageChange} actor={actor} />
    </QueryClientProvider>
  )
}
