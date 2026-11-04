import type { CompanyWorkday } from '#/features/scheduling/scheduling.types'

export type WorkingSession = {
  id: string
  workDate: string
  timezone: string
  startedAt: string
  endedAt: string | null
  expectedEndAt: string
  expectedStartAt: string
  maxOpenHours: number
}
export type AttendanceDay = {
  date: string
  timezone: string
  firstIn: string
  lastOut: string | null
  seconds: number
  lateSeconds: number
  earlySeconds: number
  earlyStartSeconds: number
  outsideSeconds: number
  approvedOutsideSeconds: number
  pendingReviews: number
  rejectedReviews: number
  requiresReview: boolean
  corrected: boolean
  incomplete: boolean
}

export type ReviewSession = WorkingSession & {
  isFirstOfDay: boolean
  isLastOfDay: boolean
  employeeId: string
  employeeName: string
  revision: number
  reviewState: string
  approvedOutsideSeconds: number
  originalStartedAt: string | null
  originalEndedAt: string | null
  canReview: boolean
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
