export const jobsTimeZone = 'Asia/Tbilisi'

export function jobsToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: jobsTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
export function jobsMonthRange(month = jobsToday().slice(0, 7)) {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
  }
}
/** Calendar dates use local Date objects only for DayPicker, never for timestamp filtering. */
export function jobCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}
export function jobCalendarDateString(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
export function formatJobsRange(range: { from: string; to: string }) {
  return `${formatJobDay(range.from)} - ${formatJobDay(range.to)}`
}
export function formatJobDay(date: string) {
  return date.split('-').reverse().join('.')
}
