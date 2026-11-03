import { createFileRoute } from '@tanstack/react-router'
import { SecuritySettingsPage } from '#/features/access/pages/security-settings-page'
import { accessContent } from '#/features/access/access.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/settings/security')(
  {
    beforeLoad: () =>
      requirePagePermission({ data: { permission: 'security.configure' } }),
    head: () =>
      pageHead(
        accessContent.securitySettings.title,
        accessContent.securitySettings.description,
      ),
    component: SecuritySettingsPage,
  },
)
