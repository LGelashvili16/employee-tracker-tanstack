import { FeaturePage } from '#/components/common/feature-page'
import { authContent } from '../auth.content'

export function ForgotPasswordPage() {
  return <FeaturePage {...authContent.forgotPassword} />
}
