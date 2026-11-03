import { FeaturePage } from '#/components/common/feature-page'
import { jobsContent } from '../jobs.content'

export function NewJobPage() {
  return <FeaturePage {...jobsContent.newJob} />
}
