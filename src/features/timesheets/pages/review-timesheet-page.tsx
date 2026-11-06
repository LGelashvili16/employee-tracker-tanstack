import { getRouteApi, Link } from '@tanstack/react-router'
import { TimesheetsWorkspace } from '../components/timesheets-workspace'

const route = getRouteApi('/_authenticated/manage/timesheets/$timesheetId')

export function ReviewTimesheetPage() {
  const { actor } = route.useRouteContext()
  const { timesheetId } = route.useParams()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/manage/timesheets"
        search={{ month: search.month }}
        className="w-fit text-sm underline underline-offset-4"
      >
        გუნდის სამუშაო საათები
      </Link>
      <TimesheetsWorkspace
        key={`${actor.id}-${timesheetId}`}
        actor={actor}
        team
        search={{ ...search, userId: timesheetId }}
        onSearchChange={(value) => {
          void navigate({ search: { month: value.month, page: value.page } })
        }}
      />
    </div>
  )
}
