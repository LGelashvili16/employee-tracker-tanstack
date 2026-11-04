import {
  IconArrowRight,
  IconCalendarWeek,
  IconChartBar,
} from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { ChartStatFlow } from '#/components/charts/chart-stat-flow'
import { useElapsedSeconds } from '../hooks/use-elapsed-seconds'
import {
  DAILY_BREAK_ALLOWANCE_SECONDS,
  elapsedSeconds,
  formatAttendanceDuration,
  startOfWorkWeek,
} from '../attendance.rules'
import type { AttendanceOverview } from '../attendance.types'
import { formatAttendanceDate } from '../attendance.presentation'
import { cn } from '#/lib/utils'

export function AttendanceDayWidgets({
  overview,
  compact = false,
}: {
  overview: AttendanceOverview
  compact?: boolean
}) {
  const workday = overview.workday
  return (
    <div
      className={cn(
        compact ? 'contents' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-1',
      )}
    >
      <Card
        className={cn(
          'rounded-2xl shadow-sm',
          compact
            ? '[--card-spacing:--spacing(4)]'
            : '[--card-spacing:--spacing(5)]',
        )}
      >
        <CardHeader>
          <CardTitle
            className={cn('flex items-center gap-2', compact && 'text-sm')}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <IconCalendarWeek className="size-5" aria-hidden="true" />
            </span>
            დღევანდელი განრიგი
          </CardTitle>
        </CardHeader>
        <CardContent
          className={cn('flex flex-1 flex-col', compact ? 'gap-3' : 'gap-5')}
        >
          {workday.kind === 'scheduled' ? (
            <div
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30',
                compact ? 'p-3' : 'p-4',
              )}
            >
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">დაწყება</span>
                <span
                  className={cn(
                    'font-semibold tracking-tight tabular-nums',
                    compact ? 'text-xl' : 'text-2xl',
                  )}
                >
                  {workday.start}
                </span>
              </div>
              <IconArrowRight
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1 text-right">
                <span className="text-xs text-muted-foreground">დასრულება</span>
                <span
                  className={cn(
                    'font-semibold tracking-tight tabular-nums',
                    compact ? 'text-xl' : 'text-2xl',
                  )}
                >
                  {workday.end}
                </span>
              </div>
            </div>
          ) : (
            <Badge
              variant={workday.kind === 'day_off' ? 'secondary' : 'orange'}
            >
              {workday.kind === 'day_off'
                ? 'დასვენების დღე'
                : 'განრიგი არ არის განსაზღვრული'}
            </Badge>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{formatAttendanceDate(workday.date)}</span>
            {workday.kind !== 'unconfigured' ? (
              <span>{workday.timezone}</span>
            ) : null}
          </div>
          {compact &&
          workday.kind === 'scheduled' &&
          workday.startsAt &&
          workday.endsAt ? (
            <div className="mt-auto flex flex-col gap-2 border-t pt-4">
              <dl className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">
                    ცვლის ხანგრძლივობა
                  </dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {formatAttendanceDuration(
                      elapsedSeconds(workday.startsAt, workday.endsAt),
                    )}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">
                    შესვენების ნორმა
                  </dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {formatAttendanceDuration(DAILY_BREAK_ALLOWANCE_SECONDS)}
                  </dd>
                </div>
              </dl>
              <p className="text-xs leading-relaxed text-muted-foreground">
                შესვენება ცალკეა მითითებული და აღრიცხულ დროს ავტომატურად არ
                აკლდება.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <WeeklyWidget
        key={overview.serverNow}
        overview={overview}
        compact={compact}
      />
    </div>
  )
}

function WeeklyWidget({
  overview,
  compact,
}: {
  overview: AttendanceOverview
  compact: boolean
}) {
  const running =
    overview.openSession !== null &&
    overview.openSession.workDate >= startOfWorkWeek(overview.workday.date)
  const seconds = overview.week.seconds + useElapsedSeconds(running)
  return (
    <Card
      className={cn(
        'rounded-2xl shadow-sm',
        compact
          ? '[--card-spacing:--spacing(4)]'
          : '[--card-spacing:--spacing(5)]',
      )}
    >
      <CardHeader>
        <CardTitle
          className={cn('flex items-center gap-2', compact && 'text-sm')}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IconChartBar className="size-5" aria-hidden="true" />
          </span>
          ამ კვირაში
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col">
          <ChartStatFlow
            value={Math.floor(seconds / 60) / 60}
            formatOptions={{ maximumFractionDigits: 1 }}
            suffix=" სთ"
            label="ნამუშევარი დრო"
            valueClassName={cn(
              'font-semibold tracking-tight',
              compact ? 'text-3xl' : 'text-4xl',
            )}
          />
        </div>
        <div className="flex flex-col gap-3 border-t pt-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">სამუშაო დღეები</span>
            <span className="font-medium tabular-nums">
              {overview.week.days}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">დაგვიანება</span>
            <Badge variant={overview.week.lateSeconds > 0 ? 'orange' : 'green'}>
              {formatAttendanceDuration(overview.week.lateSeconds)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
