/** General public holidays under Labour Code Article 30, checked 2026-11-09.
 * https://matsne.gov.ge/ka/document/view/1155567
 * Contractual substitutions and additional government-declared dates require HR reconciliation.
 */
export function georgianPublicHolidays(year: number) {
  const dates = new Set(
    [
      '01-01',
      '01-02',
      '01-07',
      '01-19',
      '03-03',
      '03-08',
      '04-09',
      '05-09',
      '05-12',
      '05-17',
      '05-26',
      '08-28',
      '10-14',
      '11-23',
    ].map((day) => `${year}-${day}`),
  )
  // Julian computus, converted to Gregorian calendar; supported application years are 2000-2100.
  const d = (19 * (year % 19) + 15) % 30
  const e = (2 * (year % 4) + 4 * (year % 7) - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31)
  const day = ((d + e + 114) % 31) + 1
  const shift = Math.floor(year / 100) - Math.floor(year / 400) - 2
  const easter = Date.UTC(year, month - 1, day + shift)
  for (const offset of [-2, -1, 0, 1])
    dates.add(new Date(easter + offset * 86400000).toISOString().slice(0, 10))
  return dates
}

export function availableVacationDays(
  row: {
    vacationAnnualDays: number
    vacationRemainingDays: number
    vacationPeriodYear: number
  },
  year: number,
) {
  return (
    row.vacationRemainingDays +
    Math.max(0, year - row.vacationPeriodYear) * row.vacationAnnualDays
  )
}

export function chargeableVacationDays(
  days: Array<{ date: string; working: boolean }>,
) {
  const calendars = new Map<number, Set<string>>()
  return days.filter(({ date, working }) => {
    if (!working) return false
    const year = Number(date.slice(0, 4))
    let holidays = calendars.get(year)
    if (!holidays) {
      holidays = georgianPublicHolidays(year)
      calendars.set(year, holidays)
    }
    return !holidays.has(date)
  }).length
}
