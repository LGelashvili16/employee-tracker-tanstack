import { createFileRoute } from '@tanstack/react-router'
import { AnnouncementsPage } from '#/features/announcements/pages/announcements-page'
import { announcementSearchSchema } from '#/features/announcements/announcements.schemas'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/manage/announcements')({
  validateSearch: announcementSearchSchema,
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'announcements.manage' } }),
  head: () =>
    pageHead('განცხადებების მართვა', 'კომპანიის განცხადებების გამოქვეყნება.'),
  component: Page,
})
function Page() {
  const { actor } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <AnnouncementsPage
      manage
      actorId={actor.id}
      search={search}
      onSearch={(next, replace) => {
        void navigate({ search: next, replace })
      }}
    />
  )
}
