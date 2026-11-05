import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '#/features/access/pages/users-page'
import { accessContent } from '#/features/access/access.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { accountSearchSchema } from '#/features/access/access.schemas'

export const Route = createFileRoute('/_authenticated/admin/users/')({
  validateSearch: accountSearchSchema,
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'users.manage' } }),
  head: () =>
    pageHead(accessContent.users.title, accessContent.users.description),
  component: AccountManagementRoute,
})

function AccountManagementRoute() {
  const { page } = Route.useSearch()
  const { actor } = Route.useRouteContext()
  const navigate = Route.useNavigate()
  return (
    <UsersPage
      page={page}
      actor={actor}
      onPageChange={(nextPage) => {
        void navigate({ search: { page: nextPage } })
      }}
    />
  )
}
