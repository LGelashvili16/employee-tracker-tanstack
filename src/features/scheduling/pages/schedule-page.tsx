import { FeaturePage } from '#/components/common/feature-page'
import { schedulingContent } from '../scheduling.content'

export function SchedulePage() {
  return <FeaturePage {...schedulingContent.schedule} />
}
