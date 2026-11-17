import { getRouteApi } from '@tanstack/react-router'
import { ComplaintListView } from '../components/complaint-list-view'

const route = getRouteApi('/_authenticated/manage/complaints')
export function ReviewComplaintsPage() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  return (
    <ComplaintListView
      actorId={actor.id}
      search={search}
      review
      onChange={(next, replace) => {
        void navigate({ search: next, replace })
      }}
    />
  )
}
