import { format, parseISO } from 'date-fns'
import { ka } from 'date-fns/locale'
import type { AttendanceOverview } from './attendance.types'
import {
  DAILY_BREAK_ALLOWANCE_SECONDS,
  DAILY_WORK_TARGET_SECONDS,
  needsSessionReview,
} from './attendance.rules'

export function workDurationStatus(seconds: number) {
  if (seconds < DAILY_WORK_TARGET_SECONDS)
    return {
      variant: 'yellow',
      label: '8 საათზე ნაკლები',
    } as const
  // The counter includes elapsed attendance; the break is an allowance, not a recorded deduction.
  if (seconds <= DAILY_WORK_TARGET_SECONDS + DAILY_BREAK_ALLOWANCE_SECONDS)
    return {
      variant: 'green',
      label: '8 საათი შესრულებულია',
    } as const
  return {
    variant: 'orange',
    label: '9 საათზე მეტი',
  } as const
}

export function attendanceStatus(overview: AttendanceOverview): {
  label: string
  variant: 'green' | 'red' | 'yellow' | 'orange' | 'secondary' | 'blue'
} {
  if (overview.openSession) {
    return needsSessionReview(
      overview.openSession.startedAt,
      overview.serverNow,
      overview.openSession.maxOpenHours,
    )
      ? { label: 'ხანგრძლივი ჩანაწერი გადასამოწმებელია', variant: 'red' }
      : overview.openSession.workDate !== overview.workday.date
        ? { label: 'წინა დღეს დაწყებული', variant: 'secondary' }
        : { label: 'მუშაობთ', variant: 'green' }
  }
  if (overview.today) {
    return {
      label: 'დასრულებულია',
      variant: overview.today.lateSeconds
        ? 'orange'
        : overview.today.earlySeconds
          ? 'yellow'
          : 'green',
    }
  }
  if (overview.approvedLeave) {
    return overview.approvedLeave.kind === 'sick_leave'
      ? { label: 'ბიულეტენი', variant: 'blue' }
      : overview.approvedLeave.kind === 'vacation'
        ? { label: 'შვებულება', variant: 'blue' }
        : { label: 'დასვენების დღე', variant: 'secondary' }
  }
  if (overview.workday.kind === 'unconfigured') {
    return { label: 'განრიგი არ არის', variant: 'orange' }
  }
  if (overview.workday.kind === 'day_off') {
    return { label: 'დასვენების დღე', variant: 'secondary' }
  }
  return { label: 'არ დაწყებულა', variant: 'yellow' }
}

export function formatAttendanceDate(date: string, compact = false) {
  // Format a calendar date without depending on the host's Georgian ICU data.
  return format(parseISO(date), compact ? 'd MMM' : 'd MMMM yyyy', {
    locale: ka,
  })
}
