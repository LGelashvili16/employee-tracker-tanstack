import { FeaturePage } from '#/components/common/feature-page'
import { accessContent } from '../access.content'

export function SecuritySettingsPage() {
  return <FeaturePage {...accessContent.securitySettings} />
}
