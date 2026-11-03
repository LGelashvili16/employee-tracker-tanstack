import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '#/features/access/pages/users-page'
import { accessContent } from '#/features/access/access.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/users/')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'users.manage' } }),
  head: () =>
    pageHead(accessContent.users.title, accessContent.users.description),
  component: UsersPage,
})
