import { createFileRoute } from '@tanstack/react-router'
import { CompanySettingsPage } from '#/features/company-settings/pages/company-settings-page'
import { companySettingsContent } from '#/features/company-settings/company-settings.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/settings/company')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'company.configure' } }),
  head: () =>
    pageHead(
      companySettingsContent.companySettings.title,
      companySettingsContent.companySettings.description,
    ),
  component: CompanySettingsPage,
})
