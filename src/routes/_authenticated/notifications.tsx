import { createFileRoute } from '@tanstack/react-router'
import { NotificationsPage } from '#/features/notifications/pages/notifications-page'
import { notificationsContent } from '#/features/notifications/notifications.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/notifications')({
  head: () =>
    pageHead(
      notificationsContent.notifications.title,
      notificationsContent.notifications.description,
    ),
  component: NotificationsPage,
})
