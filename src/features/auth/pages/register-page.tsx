import { FeaturePage } from '#/components/common/feature-page'
import { authContent } from '../auth.content'

export function RegisterPage() {
  return <FeaturePage {...authContent.register} />
}
