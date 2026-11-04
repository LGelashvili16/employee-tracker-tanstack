import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import { TZDate } from 'react-day-picker'
import { IconCalendar } from '@tabler/icons-react'
import { Calendar } from '#/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

/** Compact date/month layout inspired by https://wigggle-ui.vercel.app/widgets/calendar, composed with the existing calendar. */
export function CurrentDayWidget({
  date,
  timezone,
}: {
  date: string
  timezone: string
}) {
  const [year, month, day] = date.split('-').map(Number)
  // Use the server's company-local calendar date for both SSR and hydration, even near midnight.
  const today = new TZDate(year, month - 1, day, 12, 0, 0, timezone)
  const localized = (value: Date, pattern: string) =>
    format(value, pattern, { locale: ka })
  return (
    <Card className="@container h-full rounded-2xl bg-gradient-to-br from-badge-orange/15 via-card to-card shadow-sm [--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-badge-orange text-badge-orange-foreground">
            <IconCalendar className="size-5" aria-hidden="true" />
          </span>
          დღევანდელი თარიღი
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 @xs:flex-row @xs:justify-between">
        <time
          dateTime={date}
          aria-label={localized(today, 'EEEE, d MMMM yyyy')}
          className="flex w-full items-center justify-center gap-4 @xs:w-auto @xs:flex-col @xs:items-start @xs:gap-1"
        >
          <span className="text-4xl font-semibold tracking-tight tabular-nums @xs:order-2">
            {localized(today, 'dd')}
          </span>
          <span className="flex flex-col gap-1 @xs:contents">
            <span className="text-sm font-medium text-badge-orange-foreground @xs:order-1">
              {localized(today, 'EEEE')}
            </span>
            <span className="text-sm text-muted-foreground @xs:order-3">
              {localized(today, 'MMMM yyyy')}
            </span>
            <span className="text-xs text-muted-foreground @xs:order-4 @xs:mt-2">
              {timezone}
            </span>
          </span>
        </time>
        <Calendar
          locale={ka}
          timeZone={timezone}
          noonSafe
          month={today}
          today={today}
          weekStartsOn={1}
          hideNavigation
          disableNavigation
          showOutsideDays={false}
          className="shrink-0 bg-transparent p-0 text-xs [--cell-size:--spacing(6)]"
          modifiers={{ weekend: { dayOfWeek: [0, 6] } }}
          modifiersClassNames={{
            weekend:
              'text-badge-red-foreground data-[today=true]:text-badge-orange-foreground',
          }}
          classNames={{
            month_caption: 'sr-only',
            month: 'flex w-full flex-col gap-2',
            week: 'mt-1 flex w-full',
            day: 'size-(--cell-size) rounded-md text-center align-middle text-xs tabular-nums',
            today:
              'rounded-md bg-badge-orange font-semibold text-badge-orange-foreground ring-1 ring-badge-orange-foreground/30',
            weekday:
              'size-(--cell-size) shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground',
          }}
          labels={{
            labelGrid: (value) => localized(value, 'MMMM yyyy'),
            labelWeekday: (value) => localized(value, 'EEEE'),
            labelGridcell: (value, modifiers) =>
              `${localized(value, 'EEEE, d MMMM yyyy')}${modifiers?.today ? ', დღეს' : ''}`,
          }}
        />
      </CardContent>
    </Card>
  )
}
