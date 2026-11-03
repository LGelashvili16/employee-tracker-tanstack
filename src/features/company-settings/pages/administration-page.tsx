import { FeaturePage } from '#/components/common/feature-page'
import { companySettingsContent } from '../company-settings.content'

export function AdministrationPage() {
  return <FeaturePage {...companySettingsContent.administration} />
}
