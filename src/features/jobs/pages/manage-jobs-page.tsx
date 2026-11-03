import { FeaturePage } from '#/components/common/feature-page'
import { jobsContent } from '../jobs.content'

export function ManageJobsPage() {
  return <FeaturePage {...jobsContent.manageJobs} />
}
