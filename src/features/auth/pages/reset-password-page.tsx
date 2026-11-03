import { FeaturePage } from '#/components/common/feature-page'
import { authContent } from '../auth.content'

export function ResetPasswordPage() {
  return <FeaturePage {...authContent.resetPassword} />
}
