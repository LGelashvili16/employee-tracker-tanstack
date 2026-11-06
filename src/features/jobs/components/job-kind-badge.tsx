import { Badge } from '#/components/ui/badge'
import { jobKinds } from '../jobs.presentation'
import type { JobKind } from '../jobs.types'

export function JobKindBadge({ kind }: { kind: JobKind }) {
  const item = jobKinds[kind]
  const Icon = item.icon
  return (
    <Badge variant={item.variant}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {item.label}
    </Badge>
  )
}
