import { getRouteApi, Link } from '@tanstack/react-router'
import { TimesheetsWorkspace } from '../components/timesheets-workspace'
import { AttendanceNavigation } from '#/features/attendance/components/attendance-navigation'

const route = getRouteApi('/_authenticated/timesheets/')

export function TimesheetsPage() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        ჩემი სამუშაო საათები
      </h1>
      <AttendanceNavigation>
        <TimesheetsWorkspace
          key={actor.id}
          actor={actor}
          search={search}
          onSearchChange={(value, replace = false) => {
            const { userId: _userId, ...next } = value
            void navigate({ search: next, replace })
          }}
          renderLink={({ userId: _userId, ...linkSearch }) => (
            <Link to="/timesheets" search={linkSearch} />
          )}
        />
      </AttendanceNavigation>
    </section>
  )
}
