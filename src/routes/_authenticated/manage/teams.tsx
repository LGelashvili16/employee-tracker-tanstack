import { createFileRoute } from '@tanstack/react-router'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { pageHead } from '#/lib/page-head'
import { teamSearchSchema } from '#/features/teams/teams.schemas'
import { TeamsPage } from '#/features/teams/pages/teams-page'

export const Route = createFileRoute('/_authenticated/manage/teams')({
  validateSearch: teamSearchSchema,
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'teams.manage' } }),
  head: () => pageHead('გუნდები', 'წარმოების გუნდებისა და წევრების მართვა.'),
  component: Page,
})
function Page() {
  const { actor } = Route.useRouteContext()
  const navigate = Route.useNavigate()
  return (
    <TeamsPage
      actorId={actor.id}
      search={Route.useSearch()}
      onSearch={(search, replace = false) => {
        void navigate({ search, replace })
      }}
    />
  )
}
