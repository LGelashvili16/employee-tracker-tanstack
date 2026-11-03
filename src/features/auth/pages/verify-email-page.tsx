import { FeaturePage } from '#/components/common/feature-page'
import { authContent } from '../auth.content'

export function VerifyEmailPage() {
  return <FeaturePage {...authContent.verifyEmail} />
}
