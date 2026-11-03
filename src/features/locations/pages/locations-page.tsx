import { FeaturePage } from '#/components/common/feature-page'
import { locationsContent } from '../locations.content'

export function LocationsPage() {
  return <FeaturePage {...locationsContent.locations} />
}
