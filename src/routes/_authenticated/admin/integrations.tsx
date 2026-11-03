import { createFileRoute } from '@tanstack/react-router'
import { IntegrationsPage } from '#/features/integrations/pages/integrations-page'
import { integrationsContent } from '#/features/integrations/integrations.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/integrations')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'integrations.manage' } }),
  head: () =>
    pageHead(
      integrationsContent.integrations.title,
      integrationsContent.integrations.description,
    ),
  component: IntegrationsPage,
})
