import { createFileRoute } from '@tanstack/react-router'
import { AnnouncementsPage } from '#/features/announcements/pages/announcements-page'
import { announcementSearchSchema } from '#/features/announcements/announcements.schemas'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/announcements')({
  validateSearch: announcementSearchSchema,
  head: () => pageHead('განცხადებები', 'კომპანიის განცხადებები და სიახლეები.'),
  component: Page,
})
function Page() {
  const { actor } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <AnnouncementsPage
      actorId={actor.id}
      search={search}
      onSearch={(next, replace) => {
        void navigate({ search: next, replace })
      }}
    />
  )
}
