import type { CompanySchedule } from './scheduling.schemas'

export type ScheduleSettings = {
  current: CompanySchedule | null
  latest: CompanySchedule | null
  upcoming: Array<CompanySchedule>
  hasMoreUpcoming: boolean
  today: string
  minimumEffectiveFrom: string
  timezone: string | null
}
