import { createFileRoute } from '@tanstack/react-router'
import { LeaveSettingsPage } from '#/features/leave/pages/leave-settings-page'
import { leaveContent } from '#/features/leave/leave.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/settings/leave')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'leave.configure' } }),
  head: () =>
    pageHead(
      leaveContent.leaveSettings.title,
      leaveContent.leaveSettings.description,
    ),
  component: LeaveSettingsPage,
})
