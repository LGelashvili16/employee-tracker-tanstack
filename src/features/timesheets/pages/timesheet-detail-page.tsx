import { getRouteApi, Link } from '@tanstack/react-router'
import { TimesheetsWorkspace } from '../components/timesheets-workspace'

const route = getRouteApi('/_authenticated/timesheets/$timesheetId')

export function TimesheetDetailPage() {
  const { actor } = route.useRouteContext()
  const { timesheetId } = route.useParams()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <div className="flex flex-col gap-5">
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
        onSearchChange={(value) => {
          void navigate({
            params: { timesheetId: value.month ?? timesheetId },
            search: { page: value.page },
          })
        }}
      />
    </div>
  )
}
