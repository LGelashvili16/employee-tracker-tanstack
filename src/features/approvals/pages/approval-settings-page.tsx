import { FeaturePage } from '#/components/common/feature-page'
import { approvalsContent } from '../approvals.content'

export function ApprovalSettingsPage() {
  return <FeaturePage {...approvalsContent.approvalSettings} />
}
