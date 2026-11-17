import { IconCalendarWeek, IconClock, IconCoffee } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import {
  DAILY_BREAK_ALLOWANCE_SECONDS,
  elapsedSeconds,
  formatAttendanceDuration,
} from '../attendance.rules'
import type { AttendanceOverview } from '../attendance.types'
import type { ApprovedLeave } from '#/features/leave/leave.types'
import {
  formatLeaveDate,
  formatLeaveEndDate,
  kindLabels,
} from '#/features/leave/leave.presentation'

export function AttendanceScheduleWidget({
  workday,
  compact,
  approvedLeave,
}: {
  workday: AttendanceOverview['workday']
  compact: boolean
  approvedLeave?: ApprovedLeave | null
}) {
  return (
    <Card
      size={compact ? 'sm' : 'default'}
      className={cn(
        'h-full rounded-2xl shadow-sm',
        compact
          ? 'bg-gradient-to-br from-muted/50 via-card to-card'
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
        {approvedLeave ? (
          <div className="flex flex-col gap-3">
            <Badge
              variant={approvedLeave.kind === 'vacation' ? 'blue' : 'secondary'}
            >
              {kindLabels[approvedLeave.kind]}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {formatLeaveDate(approvedLeave.startDate)}
              {approvedLeave.endDate !== approvedLeave.startDate
                ? ` / ${formatLeaveEndDate(approvedLeave.endDate)}`
                : ''}
            </p>
          </div>
        ) : workday.kind === 'scheduled' ? (
          <div
            className={cn(
              'rounded-xl',
              compact
                ? 'bg-muted/40 p-3'
                : 'border border-border/60 bg-muted/30 p-4',
            )}
          >
            <dl className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">დაწყება</dt>
                <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                  {workday.start}
                </dd>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <dt className="text-xs text-muted-foreground">დასრულება</dt>
                <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                  {workday.end}
                </dd>
              </div>
            </dl>
            <div aria-hidden="true" className="mt-3 flex items-center gap-2">
              <span className="size-2 rounded-full bg-badge-green-foreground ring-4 ring-badge-green" />
              <span className="h-px flex-1 bg-gradient-to-r from-badge-green-foreground/50 via-border to-badge-orange-foreground/50" />
              <span className="size-2 rounded-full bg-badge-orange-foreground ring-4 ring-badge-orange" />
            </div>
          </div>
        ) : (
          <Badge variant={workday.kind === 'day_off' ? 'secondary' : 'orange'}>
            {workday.kind === 'day_off'
              ? 'დასვენების დღე'
              : 'განრიგი არ არის განსაზღვრული'}
          </Badge>
        )}
        {compact &&
        !approvedLeave &&
        workday.kind === 'scheduled' &&
        workday.startsAt &&
        workday.endsAt ? (
          <>
            <dl className="grid grid-cols-2 gap-3">
              <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border/60 bg-card/40 p-2">
                <dt className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <IconClock
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>მუშაობის ხანგრძლივობა</span>
                </dt>
                <dd className="pl-6 text-lg font-semibold tabular-nums">
                  {formatAttendanceDuration(
                    elapsedSeconds(workday.startsAt, workday.endsAt),
                  )}
                </dd>
              </div>
              <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-badge-orange-foreground/10 bg-badge-orange/20 p-2">
                <dt className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <IconCoffee
                    className="mt-0.5 size-4 shrink-0 text-badge-orange-foreground"
                    aria-hidden="true"
                  />
                  <span>შესვენების დრო</span>
                </dt>
                <dd className="pl-6 text-lg font-semibold tabular-nums">
                  {formatAttendanceDuration(DAILY_BREAK_ALLOWANCE_SECONDS)}
                </dd>
              </div>
            </dl>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
