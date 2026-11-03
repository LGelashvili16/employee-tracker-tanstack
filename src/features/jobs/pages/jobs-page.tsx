import { FeaturePage } from '#/components/common/feature-page'
import { jobsContent } from '../jobs.content'

export function JobsPage() {
  return <FeaturePage {...jobsContent.jobs} />
}
