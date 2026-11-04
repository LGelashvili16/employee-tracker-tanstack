import { format, parseISO } from 'date-fns'
import { ka } from 'date-fns/locale'
import type { AttendanceOverview } from './attendance.types'

export function attendanceStatus(overview: AttendanceOverview): {
  label: string
  variant: 'green' | 'red' | 'yellow' | 'orange' | 'secondary'
} {
  if (overview.openSession) {
    return overview.openSession.workDate !== overview.workday.date
      ? { label: 'გამოტოვებული გასვლა', variant: 'red' }
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
