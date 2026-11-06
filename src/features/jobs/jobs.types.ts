import type { z } from 'zod'
import type {
  jobKindSchema,
  jobSearchSchema,
  jobStatusSchema,
} from './jobs.schemas'

export type JobStatus = z.infer<typeof jobStatusSchema>
export type JobKind = z.infer<typeof jobKindSchema>
export type JobMapPosition = {
  longitude: number
  latitude: number
  kind?: JobKind
  address?: string
}
export type JobSearch = z.infer<typeof jobSearchSchema>
export type JobSummary = {
  id: string
  title: string
  address: string
  kind: JobKind
  deadline: string | null
  status: JobStatus
  longitude: number | null
  latitude: number | null
  assigneeId: string | null
  assigneeName: string | null
  version: number
  createdAt: string
  updatedAt: string
}
export type JobMarker = Pick<JobSummary, 'id' | 'title' | 'kind' | 'status'> & {
  longitude: number
  latitude: number
}
export type JobDetail = JobSummary & {
  streetNameKa: string | null
  streetNameEn: string | null
  locationLabelKa: string | null
  locationLabelEn: string | null
  locationResolvedAt: string | null
  notes: string
  creatorName: string
  history: Array<{
    id: string
    action: string
    status: JobStatus
    note: string
    actorName: string
    createdAt: string
  }>
  hasMoreHistory: boolean
}
export type JobsWorkspace = {
  items: Array<JobSummary>
  markers: Array<JobMarker>
  total: number
  mapTruncated: boolean
  unmappedTotal: number
}
