/** Calendar date in the explicit company timezone, independent of the host/browser timezone. */
export function companyLocalDate(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

/** UTC is used only for date arithmetic, never to interpret a scheduled shift. */
export function followingDate(date: string) {
  const instant = new Date(`${date}T00:00:00Z`)
  instant.setUTCDate(instant.getUTCDate() + 1)
  return instant.toISOString().slice(0, 10)
}

export function earliestScheduleDate(today: string, latest: string | null) {
  if (!latest) return today
  return followingDate(latest > today ? latest : today)
}
