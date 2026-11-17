import { getRouteApi } from '@tanstack/react-router'
import { LeaveListView } from '../components/leave-list-view'

const route = getRouteApi('/_authenticated/leave')

export function LeavePage() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <LeaveListView
      actorId={actor.id}
      search={search}
      onChange={(next, replace) => {
        void navigate({ search: next, replace })
      }}
    />
  )
}
