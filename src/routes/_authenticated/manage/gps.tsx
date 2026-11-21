import { createFileRoute } from '@tanstack/react-router'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { hasPermission } from '#/lib/authorization/permissions'
import { pageHead } from '#/lib/page-head'
import { gpsSearchSchema } from '#/features/gps/gps.schemas'
import { GpsPage } from '#/features/gps/pages/gps-page'

export const Route = createFileRoute('/_authenticated/manage/gps')({
  validateSearch: gpsSearchSchema,
  beforeLoad: () => requirePagePermission({ data: { permission: 'gps.read' } }),
  head: () =>
    pageHead('GPS მოწყობილობები', 'მოწყობილობების მდებარეობები და მართვა'),
  component: Page,
})

function Page() {
  const { actor } = Route.useRouteContext()
  const navigate = Route.useNavigate()
  return (
    <GpsPage
      actorId={actor.id}
      canManage={hasPermission(actor, 'gps.manage')}
      search={Route.useSearch()}
      onSearch={(search, replace) => {
        void navigate({ search, replace })
      }}
    />
  )
}
