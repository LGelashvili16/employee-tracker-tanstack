import type { CompanySchedule } from './scheduling.schemas'

export type CompanyWorkday = {
  date: string
  timezone: string
  kind: 'scheduled' | 'day_off' | 'unconfigured'
  effectiveFrom: string | null
  start: string | null
  end: string | null
  startsAt: string | null
  endsAt: string | null
}

export type ScheduleSettings = {
  current: CompanySchedule | null
  latest: CompanySchedule | null
  upcoming: Array<CompanySchedule>
  hasMoreUpcoming: boolean
  today: string
  minimumEffectiveFrom: string
  timezone: string | null
}
