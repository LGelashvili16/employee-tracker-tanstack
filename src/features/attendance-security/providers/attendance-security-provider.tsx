import { useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// These routes have no inherited QueryClient. Callers key this provider by actor
// so its page-local cache is discarded when the signed-in account changes.
export function AttendanceSecurityProvider({
  children,
}: {
  children: ReactNode
}) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
