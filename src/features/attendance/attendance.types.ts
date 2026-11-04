import type { CompanyWorkday } from '#/features/scheduling/scheduling.types'

export type WorkingSession = {
  id: string
  workDate: string
  timezone: string
  startedAt: string
  endedAt: string | null
  expectedEndAt: string
}
export type AttendanceDay = {
  date: string
  timezone: string
  firstIn: string
  lastOut: string | null
  seconds: number
  lateSeconds: number
  earlySeconds: number
  incomplete: boolean
}
export type AttendanceOverview = {
  serverNow: string
  workday: CompanyWorkday
  openSession: WorkingSession | null
  lastSessionId: string | null
  today: AttendanceDay | null
  recent: Array<AttendanceDay>
  week: { seconds: number; days: number; lateSeconds: number }
}
