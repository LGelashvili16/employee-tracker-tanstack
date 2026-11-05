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

export type WorkingWeek = CompanySchedule['days']

/** The signed-in employee's effective recurring week. `none` means no company week exists yet or the stored week is unusable. */
export type OwnSchedule = {
  source: 'individual' | 'company' | 'none'
  week: WorkingWeek | null
  timezone: string
  /** Company-local calendar date, so "today" never depends on the browser's timezone. */
  today: string
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
