import { FeaturePage } from '#/components/common/feature-page'
import { invitationsContent } from '../invitations.content'

export function InvitationsPage() {
  return <FeaturePage {...invitationsContent.invitations} />
}
