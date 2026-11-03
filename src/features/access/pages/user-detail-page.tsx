import { FeaturePage } from '#/components/common/feature-page'
import { accessContent } from '../access.content'

export function UserDetailPage() {
  return <FeaturePage {...accessContent.userDetail} />
}
