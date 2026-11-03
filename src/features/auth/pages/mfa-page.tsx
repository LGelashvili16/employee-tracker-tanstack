import { FeaturePage } from '#/components/common/feature-page'
import { authContent } from '../auth.content'

export function MfaPage() {
  return <FeaturePage {...authContent.mfa} />
}
