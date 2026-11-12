import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '#/features/access/pages/users-page'
import { accessContent } from '#/features/access/access.content'
import { accountSearchSchema } from '#/features/access/access.schemas'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/employees/')({
  validateSearch: accountSearchSchema,
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'employees.manage' } }),
  head: () =>
    pageHead(accessContent.users.title, accessContent.users.description),
  component: EmployeeManagementRoute,
})

function EmployeeManagementRoute() {
  const { page } = Route.useSearch()
  const { actor } = Route.useRouteContext()
  return <UsersPage page={page} actor={actor} />
}
