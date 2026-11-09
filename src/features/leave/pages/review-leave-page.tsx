import { getRouteApi } from '@tanstack/react-router'
import { LeaveListView } from '../components/leave-list-view'

const route = getRouteApi('/_authenticated/manage/leave')

export function ReviewLeavePage() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <LeaveListView
      actorId={actor.id}
      search={search}
      review
      onChange={(next, replace) => {
        void navigate({ search: next, replace })
      }}
    />
  )
}
