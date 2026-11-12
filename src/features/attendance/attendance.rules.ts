import { formatGeorgianDateTime } from '#/lib/date-format'

export function elapsedSeconds(start: string, end: string) {
  return Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / 1000))
}

export function formatWorkedTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  return [Math.floor(whole / 3600), Math.floor(whole / 60) % 60, whole % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export function formatAttendanceDuration(seconds: number) {
  // Keep the existing upward rounding of partial attendance minutes.
  const minutes = Math.max(0, Math.ceil(seconds / 60))
  return [Math.floor(minutes / 60), minutes % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export function formatAttendanceTime(instant: string, timezone: string) {
  return new Intl.DateTimeFormat('ka-GE', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instant))
}

export function formatAttendanceTimestamp(instant: string, timezone: string) {
  return formatGeorgianDateTime(instant, timezone, true)
}

export function startOfWorkWeek(date: string) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7))
  return value.toISOString().slice(0, 10)
}

/** Calendar arithmetic only; the caller supplies a company-local work date. */
export function attendanceWeek(date: string) {
  const start = startOfWorkWeek(date)
  const end = new Date(`${start}T12:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 6)
  return { start, end: end.toISOString().slice(0, 10) }
}
export const DAILY_WORK_TARGET_SECONDS = 8 * 3600
export const DAILY_BREAK_ALLOWANCE_SECONDS = 3600

/** Compare only actual recorded portions of an interval to its retained schedule. No break deduction or approval is inferred. */
export function sessionMetrics(
  startedAt: string,
  endedAt: string | null,
  expectedStartAt: string,
  expectedEndAt: string,
  now: string,
) {
  const start = Date.parse(startedAt)
  const end = Date.parse(endedAt ?? now)
  const expectedStart = Date.parse(expectedStartAt)
  const expectedEnd = Date.parse(expectedEndAt)
  const seconds = (milliseconds: number) =>
    Math.max(0, Math.floor(milliseconds / 1000))
  if (expectedStart === expectedEnd)
    return {
      seconds: seconds(end - start),
      earlyStartSeconds: 0,
      lateSeconds: 0,
      earlySeconds: 0,
      afterScheduleSeconds: 0,
      outsideSeconds: seconds(end - start),
    }
  const before = seconds(Math.min(end, expectedStart) - start)
  const after = seconds(end - Math.max(start, expectedEnd))
  return {
    seconds: seconds(end - start),
    earlyStartSeconds: seconds(expectedStart - start),
    lateSeconds: seconds(start - expectedStart),
    earlySeconds: endedAt ? seconds(expectedEnd - end) : 0,
    afterScheduleSeconds: after,
    outsideSeconds: before + after,
  }
}

export function needsSessionReview(
  startedAt: string,
  now: string,
  maxOpenHours: number,
) {
  return elapsedSeconds(startedAt, now) >= maxOpenHours * 3600
}

export function formatAttendanceLocalInput(instant: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const get = (type: string) => parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

export function formatAttendanceDateTime(instant: string, timezone: string) {
  return formatGeorgianDateTime(instant, timezone)
}
