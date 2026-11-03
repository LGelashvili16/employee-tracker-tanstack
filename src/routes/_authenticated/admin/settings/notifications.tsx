import { createFileRoute } from '@tanstack/react-router'
import { NotificationSettingsPage } from '#/features/notifications/pages/notification-settings-page'
import { notificationsContent } from '#/features/notifications/notifications.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute(
  '/_authenticated/admin/settings/notifications',
)({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'notifications.configure' } }),
  head: () =>
    pageHead(
      notificationsContent.notificationSettings.title,
      notificationsContent.notificationSettings.description,
    ),
  component: NotificationSettingsPage,
})
