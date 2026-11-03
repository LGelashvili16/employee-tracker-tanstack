import { FeaturePage } from '#/components/common/feature-page'
import { jobsContent } from '../jobs.content'

export function JobDetailPage() {
  return <FeaturePage {...jobsContent.jobDetail} />
}
