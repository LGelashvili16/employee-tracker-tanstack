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

export function startOfWorkWeek(date: string) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7))
  return value.toISOString().slice(0, 10)
}
