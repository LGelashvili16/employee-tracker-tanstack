import { FeaturePage } from '#/components/common/feature-page'
import { authContent } from '../auth.content'

export function AcceptInvitationPage() {
  return <FeaturePage {...authContent.acceptInvitation} />
}
