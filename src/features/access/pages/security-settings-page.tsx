import { getRouteApi } from '@tanstack/react-router'
import { SecurityPolicy } from '#/features/attendance-security/components/security-policy-form'
import { AttendanceSecurityProvider } from '#/features/attendance-security/providers/attendance-security-provider'

export function SecuritySettingsPage() {
  const { actor } = getRouteApi(
    '/_authenticated/admin/settings/security',
  ).useRouteContext()
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        უსაფრთხოების პოლიტიკა
      </h1>
      <AttendanceSecurityProvider key={actor.id}>
        <SecurityPolicy actorId={actor.id} />
      </AttendanceSecurityProvider>
    </section>
  )
}
