import { FeaturePage } from '#/components/common/feature-page'
import { jobsContent } from '../jobs.content'
import { Link } from '@tanstack/react-router'
import { IconPlus } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'

export function ManageJobsPage() {
  return (
    <div className="flex flex-col gap-4">
      <Button
        className="self-end"
        nativeButton={false}
        role="link"
        render={<Link to="/manage/jobs/new" />}
      >
        <IconPlus data-icon="inline-start" aria-hidden="true" />
        ახალი სამუშაო
      </Button>
      <FeaturePage {...jobsContent.manageJobs} />
    </div>
  )
}
