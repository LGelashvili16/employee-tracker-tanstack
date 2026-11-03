import { FeaturePage } from '#/components/common/feature-page'
import { accessContent } from '../access.content'

export function UsersPage() {
  return <FeaturePage {...accessContent.users} />
}
