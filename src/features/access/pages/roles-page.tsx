import { FeaturePage } from '#/components/common/feature-page'
import { accessContent } from '../access.content'

export function RolesPage() {
  return <FeaturePage {...accessContent.roles} />
}
