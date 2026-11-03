import { FeaturePage } from '#/components/common/feature-page'
import { companySettingsContent } from '../company-settings.content'

export function CompanySettingsPage() {
  return <FeaturePage {...companySettingsContent.companySettings} />
}
