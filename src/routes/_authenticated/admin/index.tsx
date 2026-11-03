import { createFileRoute } from '@tanstack/react-router'
import { AdministrationPage } from '#/features/company-settings/pages/administration-page'
import { companySettingsContent } from '#/features/company-settings/company-settings.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'admin.access' } }),
  head: () =>
    pageHead(
      companySettingsContent.administration.title,
      companySettingsContent.administration.description,
    ),
  component: AdministrationPage,
})
