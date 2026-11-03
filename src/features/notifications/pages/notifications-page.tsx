import { FeaturePage } from '#/components/common/feature-page'
import { notificationsContent } from '../notifications.content'

export function NotificationsPage() {
  return <FeaturePage {...notificationsContent.notifications} />
}
