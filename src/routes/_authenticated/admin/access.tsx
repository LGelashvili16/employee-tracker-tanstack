import { createFileRoute } from '@tanstack/react-router'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { pageHead } from '#/lib/page-head'
import { AdminAccessPage } from '#/features/access/pages/admin-access-page'
import { adminAccountSearchSchema } from '#/features/access/admin-access.schemas'

export const Route = createFileRoute('/_authenticated/admin/access')({
  validateSearch: adminAccountSearchSchema,
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'users.manage' } }),
  head: () =>
    pageHead(
      'მომხმარებლების წვდომა',
      'ანგარიშების სტატუსი, როლები, უფლებები და სესიები.',
    ),
  component: AdminAccessPage,
})
