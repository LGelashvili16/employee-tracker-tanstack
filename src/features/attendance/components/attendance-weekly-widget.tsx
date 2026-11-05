import { IconCalendarCheck, IconChartBar, IconClock } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { ChartStatFlow } from '#/components/charts/chart-stat-flow'
import { cn } from '#/lib/utils'
import { formatAttendanceDuration, startOfWorkWeek } from '../attendance.rules'
import { formatAttendanceDate } from '../attendance.presentation'
import { useElapsedSeconds } from '../hooks/use-elapsed-seconds'
import type { AttendanceOverview } from '../attendance.types'

const weekdayLabels = ['ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა', 'კვ']

export function AttendanceWeeklyWidget({
  overview,
  compact,
}: {
  overview: AttendanceOverview
  compact: boolean
}) {
  const monday = startOfWorkWeek(overview.workday.date)
  const running =
    overview.openSession !== null &&
    overview.openSession.workDate >= monday &&
    overview.openSession.workDate <= overview.workday.date
  const elapsed = useElapsedSeconds(running)
  const seconds = overview.week.seconds + elapsed
  // An existing private query cache may predate this projection. Keep totals visible without inventing daily data.
  const daily = Array.isArray(overview.week.daily) ? overview.week.daily : null
  const days = weekdayLabels.map((label, index) => {
    const value = new Date(`${monday}T12:00:00Z`)
    value.setUTCDate(value.getUTCDate() + index)
    const date = value.toISOString().slice(0, 10)
    return {
      date,
      label,
      seconds:
        (daily?.find((day) => day.date === date)?.seconds ?? 0) +
        (running && overview.openSession?.workDate === date ? elapsed : 0),
    }
  })
  const maximum = Math.max(1, ...days.map((day) => day.seconds))
  const late = overview.week.lateSeconds > 0
  return (
    <Card
      size={compact ? 'sm' : 'default'}
      className={cn(
        '@container/weekly h-full rounded-2xl bg-gradient-to-br from-primary/5 via-card to-card shadow-sm',
        !compact && '[--card-spacing:--spacing(5)]',
      )}
    >
      <CardHeader>
        <CardTitle
          className={cn('flex items-center gap-2', compact && 'text-sm')}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <IconChartBar className="size-5" aria-hidden="true" />
          </span>
          ამ კვირაში
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          compact
            ? 'grid flex-1 content-between gap-3 @min-[20rem]/weekly:grid-cols-2 @min-[20rem]/weekly:items-center'
            : 'flex flex-1 flex-col gap-4',
        )}
      >
        <div className="flex flex-col">
          <ChartStatFlow
            value={Math.floor(seconds / 60) / 60}
            formatOptions={{ maximumFractionDigits: 1 }}
            suffix=" სთ"
            label="ნამუშევარი დრო"
            valueClassName="text-4xl font-semibold tracking-tight"
          />
        </div>
        {daily ? (
          <figure
            aria-label="კვირის განმავლობაში აღრიცხული დრო"
            className="flex flex-col gap-2"
          >
            <figcaption className="sr-only">
              კვირის ყოველდღიური განაწილება
            </figcaption>
            <ol className="grid grid-cols-7 gap-2">
              {days.map((day) => {
                const today = day.date === overview.workday.date
                const future = day.date > overview.workday.date
                const description = `${formatAttendanceDate(day.date)}, ${future ? 'მომავალი დღე' : `აღრიცხულია ${formatAttendanceDuration(day.seconds)}`}`
                return (
                  <li
                    key={day.date}
                    aria-label={description}
                    title={description}
                    className="flex min-w-0 flex-col items-center gap-2"
                  >
                    <div
                      aria-hidden="true"
                      className={cn(
                        'relative flex h-10 w-full max-w-8 items-end overflow-hidden rounded-md',
                        today ? 'bg-badge-green/40' : 'bg-muted/50',
                        future && 'opacity-40',
                      )}
                    >
                      <span
                        className={cn(
                          'w-full rounded-md',
                          today
                            ? 'bg-badge-green-foreground/70'
                            : 'bg-primary/35',
                        )}
                        style={{ height: `${(day.seconds / maximum) * 100}%` }}
                      />
                      {day.seconds === 0 ? (
                        <span className="absolute inset-x-0 bottom-0 h-px bg-border" />
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        'text-xs whitespace-nowrap',
                        today
                          ? 'font-medium text-badge-green-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {day.label}
                    </span>
                  </li>
                )
              })}
            </ol>
          </figure>
        ) : null}
        <dl
          className={cn(
            'grid grid-cols-2 gap-3',
            compact ? '@min-[20rem]/weekly:col-span-2' : 'mt-auto',
          )}
        >
          <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/60 bg-card/40 p-3">
            <dt className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <IconCalendarCheck
                className="size-4 shrink-0"
                aria-hidden="true"
              />
              <span>სამუშაო დღეები</span>
            </dt>
            <dd className="pl-6 text-xl font-semibold tabular-nums">
              {overview.week.days}
            </dd>
          </div>
          <div
            className={cn(
              'flex min-w-0 flex-col gap-2 rounded-xl border p-3',
              late
                ? 'border-badge-orange-foreground/10 bg-badge-orange/20'
                : 'border-badge-green-foreground/10 bg-badge-green/20',
            )}
          >
            <dt className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <IconClock
                className={cn(
                  'size-4 shrink-0',
                  late
                    ? 'text-badge-orange-foreground'
                    : 'text-badge-green-foreground',
                )}
                aria-hidden="true"
              />
              <span>დაგვიანება</span>
            </dt>
            <dd
              className={cn(
                'pl-6 text-xl font-semibold tabular-nums',
                late
                  ? 'text-badge-orange-foreground'
                  : 'text-badge-green-foreground',
              )}
            >
              {formatAttendanceDuration(overview.week.lateSeconds)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
