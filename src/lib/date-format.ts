import { format, parseISO } from 'date-fns'
import { ka } from 'date-fns/locale'

export function formatGeorgianDate(date: string) {
  return format(parseISO(date), 'd MMMM, yyyy', { locale: ka })
}

export function formatGeorgianDateTime(
  instant: string,
  timezone: string,
  seconds = false,
) {
  const parts = new Intl.DateTimeFormat('en-GB-u-ca-gregory-nu-latn', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value
  const date = `${part('year')}-${part('month')}-${part('day')}`
  return `${formatGeorgianDate(date)}, ${part('hour')}:${part('minute')}${seconds ? `:${part('second')}` : ''}`
}
