import { FeaturePage } from '#/components/common/feature-page'
import { notificationsContent } from '../notifications.content'

export function NotificationSettingsPage() {
  return <FeaturePage {...notificationsContent.notificationSettings} />
}
