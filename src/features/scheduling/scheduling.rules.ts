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

type WeekDays = Array<{
  weekday: number
  hours: { start: string; end: string } | null
}>

const minutesOfDay = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

export function shiftMinutes(hours: { start: string; end: string }) {
  return minutesOfDay(hours.end) - minutesOfDay(hours.start)
}

export function weeklyMinutes(week: WeekDays) {
  return week.reduce(
    (total, day) => total + (day.hours ? shiftMinutes(day.hours) : 0),
    0,
  )
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} სთ ${rest} წთ` : `${hours} სთ`
}

/** ISO weekday (1 = Monday) of a calendar date string; noon UTC avoids any timezone shift. */
export function isoWeekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay() || 7
}

/** Compares by meaning, since stored JSON may reorder keys and days. */
export function sameWorkingWeek(first: WeekDays, second: WeekDays) {
  const canonical = (days: WeekDays) =>
    JSON.stringify(
      [...days]
        .sort((a, b) => a.weekday - b.weekday)
        .map((day) => [day.weekday, day.hours?.start, day.hours?.end]),
    )
  return canonical(first) === canonical(second)
}
