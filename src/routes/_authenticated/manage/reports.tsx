import { createFileRoute } from '@tanstack/react-router'
import { ReportsPage } from '#/features/reports/pages/reports-page'
import { reportsContent } from '#/features/reports/reports.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/reports')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'reports.read' } }),
  head: () =>
    pageHead(reportsContent.reports.title, reportsContent.reports.description),
  component: ReportsPage,
})
