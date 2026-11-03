import { FeaturePage } from '#/components/common/feature-page'
import { schedulingContent } from '../scheduling.content'

export function ManageSchedulePage() {
  return <FeaturePage {...schedulingContent.manageSchedule} />
}
