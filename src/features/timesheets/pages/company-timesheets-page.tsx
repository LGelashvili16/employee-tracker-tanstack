import { getRouteApi } from '@tanstack/react-router'
import { CompanyAttendanceNavigation } from '#/features/attendance/components/company-attendance-navigation'
import { TimesheetsWorkspace } from '../components/timesheets-workspace'

const route = getRouteApi('/_authenticated/admin/timesheets')
export function CompanyTimesheetsPage() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <div className="flex flex-col gap-6">
      <CompanyAttendanceNavigation userId={search.userId} />
      <TimesheetsWorkspace
        key={actor.id}
        actor={actor}
        company
        search={search}
        onSearchChange={(value) => {
          void navigate({ search: value })
        }}
      />
    </div>
  )
}
