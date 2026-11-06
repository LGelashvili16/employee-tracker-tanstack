import { getRouteApi } from '@tanstack/react-router'
import { TimesheetsWorkspace } from '../components/timesheets-workspace'
import { AttendanceNavigation } from '#/features/attendance/components/attendance-navigation'

const route = getRouteApi('/_authenticated/timesheets/')

export function TimesheetsPage() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <AttendanceNavigation>
      <TimesheetsWorkspace
        key={actor.id}
        actor={actor}
        search={search}
        onSearchChange={(value) => {
          void navigate({ search: { month: value.month, page: value.page } })
        }}
      />
    </AttendanceNavigation>
  )
}
