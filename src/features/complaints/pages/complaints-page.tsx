import { getRouteApi } from '@tanstack/react-router'
import { ComplaintListView } from '../components/complaint-list-view'

const route = getRouteApi('/_authenticated/complaints')
export function ComplaintsPage() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <ComplaintListView
      actorId={actor.id}
      search={search}
      onChange={(next, replace) => {
        void navigate({ search: next, replace })
      }}
    />
  )
}
