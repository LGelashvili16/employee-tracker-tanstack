import { FeaturePage } from '#/components/common/feature-page'
import { integrationsContent } from '../integrations.content'

export function IntegrationsPage() {
  return <FeaturePage {...integrationsContent.integrations} />
}
