import { createFileRoute, redirect } from '@tanstack/react-router'
import { companySettingsContent } from '#/features/company-settings/company-settings.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/')({
  beforeLoad: async () => {
    await requirePagePermission({ data: { permission: 'admin.access' } })
    throw redirect({ to: '/admin/users', replace: true })
  },
  head: () =>
    pageHead(
      companySettingsContent.administration.title,
      companySettingsContent.administration.description,
    ),
})
