import { format } from 'date-fns'
import { ka } from 'date-fns/locale'

export function timesheetMonthBounds(month: string) {
  const start = `${month}-01`
  const date = new Date(`${start}T12:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  return { start, end: date.toISOString().slice(0, 10) }
}

export function shiftTimesheetMonth(month: string, change: number) {
  const date = new Date(`${month}-01T12:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + change)
  return date.toISOString().slice(0, 7)
}
export function formatTimesheetMonth(month: string) {
  // The month is a calendar key, so use the bundled Georgian locale instead of browser ICU support.
  return format(new Date(`${month}-01T12:00:00Z`), 'LLLL yyyy', { locale: ka })
}
