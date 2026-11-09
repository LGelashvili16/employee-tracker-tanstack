import { Alert, AlertDescription } from '#/components/ui/alert'
import { RolePermissionsTable } from '../components/role-permissions-table'

export function RolesPage() {
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        როლები და უფლებები
      </h1>
      <Alert role="note" variant="info">
        <AlertDescription>
          ცხრილი აჩვენებს როლების საწყის უფლებებს. ინდივიდუალური გამონაკლისები
          მომხმარებლის წვდომის გვერდზე იმართება.
        </AlertDescription>
      </Alert>
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <RolePermissionsTable />
      </div>
    </section>
  )
}
