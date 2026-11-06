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
