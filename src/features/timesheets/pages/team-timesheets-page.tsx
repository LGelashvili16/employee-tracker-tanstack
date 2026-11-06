import { getRouteApi } from '@tanstack/react-router'
import { TeamAttendanceNavigation } from '#/features/attendance/components/team-attendance-navigation'
import { TimesheetsWorkspace } from '../components/timesheets-workspace'

const route = getRouteApi('/_authenticated/manage/timesheets/')

export function TeamTimesheetsPage() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <div className="flex flex-col gap-6">
      <TeamAttendanceNavigation roles={actor.roles} />
      <TimesheetsWorkspace
        key={actor.id}
        actor={actor}
        team
        search={search}
        onSearchChange={(value) => {
          void navigate({ search: value })
        }}
      />
    </div>
  )
}
