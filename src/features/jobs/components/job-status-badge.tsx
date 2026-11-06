import { Badge } from '#/components/ui/badge'
import { jobStatuses } from '../jobs.presentation'
import type { JobStatus } from '../jobs.types'

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { label, variant, icon: Icon } = jobStatuses[status]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  )
}
