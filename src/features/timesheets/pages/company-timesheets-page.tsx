import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CompanyAttendanceNavigation } from '#/features/attendance/components/company-attendance-navigation'
import { CompanyTimesheetsWorkspace } from '../components/company-timesheets-workspace'
import type { ReactNode } from 'react'

const route = getRouteApi('/_authenticated/admin/timesheets')
export function CompanyTimesheetsPage() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        თანამშრომლების სამუშაო საათები
      </h1>
      <CompanyAttendanceNavigation userId={search.userId}>
        <CompanyTimesheetCache key={actor.id}>
          <CompanyTimesheetsWorkspace
            actorId={actor.id}
            search={search}
            onChange={(value, replace = false) => {
              void navigate({ search: value, replace })
            }}
          />
        </CompanyTimesheetCache>
      </CompanyAttendanceNavigation>
    </section>
  )
}
function CompanyTimesheetCache({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
