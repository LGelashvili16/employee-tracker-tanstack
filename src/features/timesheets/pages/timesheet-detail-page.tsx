import { getRouteApi, Link } from '@tanstack/react-router'
import { TimesheetsWorkspace } from '../components/timesheets-workspace'

const route = getRouteApi('/_authenticated/timesheets/$timesheetId')

export function TimesheetDetailPage() {
  const { actor } = route.useRouteContext()
  const { timesheetId } = route.useParams()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        ჩემი სამუშაო საათები
      </h1>
      <Link
        to="/timesheets"
        className="w-fit text-sm underline underline-offset-4"
      >
        ჩემი სამუშაო საათები
      </Link>
      <TimesheetsWorkspace
        key={actor.id}
        actor={actor}
        search={{ ...search, month: timesheetId }}
        onSearchChange={(value, replace = false) => {
          const { month: _month, userId: _userId, ...next } = value
          void navigate({
            params: { timesheetId: value.month ?? timesheetId },
            search: next,
            replace,
          })
        }}
        renderLink={({ month, userId: _userId, ...linkSearch }) => (
          <Link
            to="/timesheets/$timesheetId"
            params={{ timesheetId: month ?? timesheetId }}
            search={linkSearch}
          />
        )}
      />
    </div>
  )
}
