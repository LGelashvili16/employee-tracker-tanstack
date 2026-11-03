import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '#/features/access/pages/roles-page'
import { accessContent } from '#/features/access/access.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/roles')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'roles.manage' } }),
  head: () =>
    pageHead(accessContent.roles.title, accessContent.roles.description),
  component: RolesPage,
})
