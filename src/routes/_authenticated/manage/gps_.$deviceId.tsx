import { createFileRoute, notFound } from '@tanstack/react-router'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { GpsHistoryPage } from '#/features/gps/pages/gps-history-page'
import { gpsDeviceParams, gpsHistorySearch } from '#/features/gps/gps.schemas'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/manage/gps_/$deviceId')({
  params: {
    parse: (params) => {
      const result = gpsDeviceParams.safeParse(params)
      if (!result.success) throw notFound()
      return result.data
    },
  },
  validateSearch: gpsHistorySearch,
  beforeLoad: () => requirePagePermission({ data: { permission: 'gps.read' } }),
  head: () =>
    pageHead('მდებარეობის ისტორია', 'GPS მოწყობილობის მდებარეობის ისტორია'),
  notFoundComponent: () => (
    <Alert>
      <AlertDescription>GPS მოწყობილობა ვერ მოიძებნა.</AlertDescription>
    </Alert>
  ),
  component: Page,
})

function Page() {
  const { actor } = Route.useRouteContext()
  const { deviceId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <GpsHistoryPage
      actorId={actor.id}
      deviceId={deviceId}
      search={search}
      onRangeChange={(range) => {
        void navigate({ search: { ...range, page: 1 } })
      }}
    />
  )
}
