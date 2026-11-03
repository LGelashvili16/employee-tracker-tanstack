import { createFileRoute } from '@tanstack/react-router'
import { ApprovalSettingsPage } from '#/features/approvals/pages/approval-settings-page'
import { approvalsContent } from '#/features/approvals/approvals.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute(
  '/_authenticated/admin/settings/approvals',
)({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'approvals.configure' } }),
  head: () =>
    pageHead(
      approvalsContent.approvalSettings.title,
      approvalsContent.approvalSettings.description,
    ),
  component: ApprovalSettingsPage,
})
