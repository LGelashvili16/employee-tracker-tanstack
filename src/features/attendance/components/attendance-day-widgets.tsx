import {
  IconArrowRight,
  IconCalendarWeek,
  IconChartBar,
} from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { ChartStatFlow } from '#/components/charts/chart-stat-flow'
import { useElapsedSeconds } from '../hooks/use-elapsed-seconds'
import { formatAttendanceDuration, startOfWorkWeek } from '../attendance.rules'
import type { AttendanceOverview } from '../attendance.types'
import { formatAttendanceDate } from '../attendance.presentation'

export function AttendanceDayWidgets({
  overview,
}: {
  overview: AttendanceOverview
}) {
  const workday = overview.workday
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
      <Card className="rounded-2xl shadow-sm [--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <IconCalendarWeek className="size-5" aria-hidden="true" />
            </span>
            დღევანდელი განრიგი
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {workday.kind === 'scheduled' ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">დაწყება</span>
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {workday.start}
                </span>
              </div>
              <IconArrowRight
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1 text-right">
                <span className="text-xs text-muted-foreground">დასრულება</span>
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
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
        </CardContent>
      </Card>
      <WeeklyWidget key={overview.serverNow} overview={overview} />
    </div>
  )
}

function WeeklyWidget({ overview }: { overview: AttendanceOverview }) {
  const running =
    overview.openSession !== null &&
    overview.openSession.workDate >= startOfWorkWeek(overview.workday.date)
  const seconds = overview.week.seconds + useElapsedSeconds(running)
  return (
    <Card className="rounded-2xl shadow-sm [--card-spacing:--spacing(5)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
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
            valueClassName="text-4xl font-semibold tracking-tight"
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
