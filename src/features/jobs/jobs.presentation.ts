import {
  IconCircleDashed,
  IconCar,
  IconMapPin,
  IconCheck,
  IconX,
  IconTool,
  IconRulerMeasure,
  IconBriefcase,
} from '@tabler/icons-react'
import type { JobKind, JobStatus } from './jobs.types'
import { jobsTimeZone } from './jobs.dates'
import { formatGeorgianDateTime } from '#/lib/date-format'

const markerStyle = (
  token:
    | 'badge-yellow'
    | 'badge-orange'
    | 'badge-green'
    | 'badge-red'
    | 'primary'
    | 'badge-blue'
    | 'badge-purple'
    | 'secondary',
) => ({
  backgroundColor: `var(--${token})`,
  color: `var(--${token}-foreground)`,
  borderColor: `var(--${token}-foreground)`,
})

export const jobStatuses = {
  pending: {
    label: 'დაგეგმილი',
    action: 'თავიდან დაგეგმვა',
    variant: 'yellow',
    icon: IconCircleDashed,
    markerStyle: markerStyle('badge-yellow'),
  },
  en_route: {
    label: 'გზაშია',
    action: 'მივდივარ ობიექტზე',
    variant: 'secondary',
    icon: IconCar,
    markerStyle: markerStyle('primary'),
  },
  on_site: {
    label: 'ობიექტზეა',
    action: 'ობიექტზე ვარ',
    variant: 'orange',
    icon: IconMapPin,
    markerStyle: markerStyle('badge-orange'),
  },
  completed: {
    label: 'შესრულებული',
    action: 'სამუშაოს დასრულება',
    variant: 'green',
    icon: IconCheck,
    markerStyle: markerStyle('badge-green'),
  },
  rejected: {
    label: 'უარყოფილი',
    action: 'სამუშაოს უარყოფა',
    variant: 'red',
    icon: IconX,
    markerStyle: markerStyle('badge-red'),
  },
} as const satisfies Record<JobStatus, unknown>
export const jobKinds = {
  installation: {
    label: 'მონტაჟი',
    createLabel: 'მონტაჟის დამატება',
    icon: IconTool,
    variant: 'blue',
    markerStyle: markerStyle('badge-blue'),
  },
  measurement: {
    label: 'აზომვა',
    createLabel: 'აზომვის დამატება',
    icon: IconRulerMeasure,
    variant: 'purple',
    markerStyle: markerStyle('badge-purple'),
  },
  other: {
    label: 'სხვა სამუშაო',
    createLabel: 'სხვა სამუშაოს დამატება',
    icon: IconBriefcase,
    variant: 'secondary',
    markerStyle: markerStyle('secondary'),
  },
} as const satisfies Record<JobKind, unknown>
export function formatJobDate(date: string) {
  return formatGeorgianDateTime(date, jobsTimeZone)
}
