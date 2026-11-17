import { AppPending } from '#/routes/-app-pending'
import { createFileRoute } from '@tanstack/react-router'
import { ensureSession } from '#/lib/auth/auth.functions'
import { AppShell } from '#/components/layout/app-shell'
import { RouteError } from '#/components/common/route-feedback'
import { AutomaticDeviceRegistration } from '#/features/attendance-security/components/automatic-device-registration'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => ({ actor: await ensureSession() }),
  component: AuthenticatedLayout,
  errorComponent: RouteError,
  pendingComponent: AppPending,
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
})
function AuthenticatedLayout() {
  const { actor } = Route.useRouteContext()
  return (
    <AutomaticDeviceRegistration key={actor.id} fallback={<AppPending />}>
      <AppShell actor={actor} />
    </AutomaticDeviceRegistration>
  )
}
