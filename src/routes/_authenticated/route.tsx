import { createFileRoute } from '@tanstack/react-router'
import { ensureSession } from '#/lib/auth/auth.functions'
import { AppShell } from '#/components/layout/app-shell'
import { RouteError, RoutePending } from '#/components/common/route-feedback'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => ({ actor: await ensureSession() }),
  component: AuthenticatedLayout,
  errorComponent: RouteError,
  pendingComponent: RoutePending,
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
})
function AuthenticatedLayout() {
  const { actor } = Route.useRouteContext()
  return <AppShell actor={actor} />
}
