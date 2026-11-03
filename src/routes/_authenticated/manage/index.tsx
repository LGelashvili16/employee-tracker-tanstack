import { createFileRoute } from '@tanstack/react-router'
import { ManagementPage } from '#/features/dashboard/pages/management-page'
import { dashboardContent } from '#/features/dashboard/dashboard.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'manage.access' } }),
  head: () =>
    pageHead(
      dashboardContent.management.title,
      dashboardContent.management.description,
    ),
  component: ManagementPage,
})
