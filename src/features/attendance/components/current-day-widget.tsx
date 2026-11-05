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
    <Card
      size="sm"
      className="@container h-full gap-2 rounded-2xl bg-gradient-to-br from-badge-orange/15 via-card to-card shadow-sm"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-badge-orange text-badge-orange-foreground">
            <IconCalendar className="size-5" aria-hidden="true" />
          </span>
          დღევანდელი თარიღი
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 @min-[20rem]:flex-row @min-[20rem]:justify-between">
        <time
          dateTime={date}
          aria-label={localized(today, 'EEEE, d MMMM yyyy')}
          className="flex w-full items-center justify-center gap-3 @min-[20rem]:w-auto @min-[20rem]:flex-col @min-[20rem]:items-start @min-[20rem]:gap-1"
        >
          <span className="text-4xl font-semibold tracking-tight tabular-nums @min-[20rem]:order-2">
            {localized(today, 'dd')}
          </span>
          <span className="flex flex-col gap-1 @min-[20rem]:contents">
            <span className="text-sm font-medium text-badge-orange-foreground @min-[20rem]:order-1">
              {localized(today, 'EEEE')}
            </span>
            <span className="text-sm text-muted-foreground @min-[20rem]:order-3">
              {localized(today, 'MMMM yyyy')}
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
            week: 'flex w-full',
            day: 'h-6 w-(--cell-size) rounded-md text-center align-middle text-xs tabular-nums',
            today:
              'rounded-md bg-badge-orange font-semibold text-badge-orange-foreground ring-1 ring-badge-orange-foreground/30',
            weekday:
              'h-6 w-(--cell-size) shrink-0 text-xs font-normal whitespace-nowrap text-muted-foreground',
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
