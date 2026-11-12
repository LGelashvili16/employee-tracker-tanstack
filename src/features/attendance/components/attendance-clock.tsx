import { useCallback, useRef } from 'react'
import { IconCirclePause, IconCirclePlay, IconClock } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { AttendanceDeviationBadges } from './attendance-deviation-badges'
import { useModal } from '#/hooks/use-modal'
import { formatGeorgianDate } from '#/lib/date-format'
import { FinishWorkConfirmation } from './finish-work-confirmation'
import { StartNonworkingDayConfirmation } from './start-nonworking-day-confirmation'
import { ChartStatFlow } from '#/components/charts/chart-stat-flow'
import { useAttendanceActions } from '../hooks/use-attendance-actions'
import { useElapsedSeconds } from '../hooks/use-elapsed-seconds'
import {
  elapsedSeconds,
  formatAttendanceTime,
  formatWorkedTime,
  needsSessionReview,
} from '../attendance.rules'
import type { AttendanceOverview } from '../attendance.types'
import {
  attendanceStatus,
  formatAttendanceDate,
  workDurationStatus,
} from '../attendance.presentation'
import { cn } from '#/lib/utils'
import { AttendanceClockPattern } from './attendance-clock-pattern'
import { WorkCurrent } from './work-current'

const digitFormat = { minimumIntegerDigits: 2, maximumFractionDigits: 0 }

export function AttendanceClock({
  overview,
  actorId,
  compact = false,
  workLog = false,
}: {
  overview: AttendanceOverview
  actorId: string
  compact?: boolean
  workLog?: boolean
}) {
  const action = useAttendanceActions(actorId, overview)
  const { openModal } = useModal()
  const submitting = useRef(false)
  const sampleReceivedAt = useRef<number | null>(null)
  const recordClockStart = useCallback((startedAt: number) => {
    sampleReceivedAt.current = startedAt
  }, [])
  const open = overview.openSession
  const status = attendanceStatus(overview)
  const oldSession = open !== null && open.workDate !== overview.workday.date
  const activeDay = oldSession
    ? overview.recent.find((day) => day.date === open.workDate)
    : overview.today
  const needsReview =
    open !== null &&
    needsSessionReview(open.startedAt, overview.serverNow, open.maxOpenHours)
  const firstIn = activeDay?.firstIn ?? open?.startedAt
  const initialSeconds = oldSession
    ? (activeDay?.seconds ?? elapsedSeconds(open.startedAt, overview.serverNow))
    : (overview.today?.seconds ?? 0)

  return (
    <Card
      className={cn(
        'h-full rounded-2xl shadow-sm [--card-spacing:--spacing(5)]',
        !compact && 'sm:[--card-spacing:--spacing(6)]',
      )}
    >
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground',
              workLog && 'hidden',
            )}
          >
            <IconClock className="size-5" aria-hidden="true" />
          </span>
          {oldSession
            ? `${formatGeorgianDate(open.workDate)} დღის აღრიცხული დრო`
            : 'დღეს ნამუშევარი'}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          {workLog ? (
            <time
              dateTime={overview.workday.date}
              className="text-sm text-muted-foreground"
            >
              {formatAttendanceDate(overview.workday.date)}
            </time>
          ) : null}
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          workLog
            ? 'grid items-center gap-6 lg:grid-cols-[auto_1fr_auto]'
            : 'flex flex-1 flex-col',
          compact ? 'gap-4' : 'gap-6',
        )}
      >
        <div
          className={cn(
            workLog
              ? 'contents'
              : '@container/clock relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden rounded-xl border border-border/60 bg-muted/30 px-3',
            !workLog && (compact ? 'min-h-48 py-5 sm:py-6' : 'py-7 sm:py-10'),
          )}
        >
          {compact ? <AttendanceClockPattern /> : null}
          <ClockTimer
            key={`${overview.serverNow}:${open?.id ?? 'stopped'}`}
            seconds={initialSeconds}
            running={open !== null}
            onStart={recordClockStart}
            compact={compact}
            workLog={workLog}
            showWorkTarget={!overview.approvedLeave}
          />
          <Button
            className={cn(
              'work-current-button relative h-11 w-full sm:w-auto sm:min-w-52',
              workLog && 'order-3 lg:justify-self-end',
            )}
            disabled={
              action.pending ||
              (!open && overview.workday.kind === 'unconfigured')
            }
            aria-busy={action.pending}
            onClick={() => {
              if (
                !open &&
                (overview.workday.kind === 'day_off' || overview.approvedLeave)
              ) {
                openModal(
                  <StartNonworkingDayConfirmation
                    start={() => action.start(true)}
                    submitting={submitting}
                    leaveKind={overview.approvedLeave?.kind}
                  />,
                  {
                    title:
                      overview.approvedLeave?.kind === 'sick_leave'
                        ? 'ბიულეტენის დროს მუშაობა'
                        : overview.approvedLeave?.kind === 'vacation'
                          ? 'შვებულების დროს მუშაობა'
                          : overview.approvedLeave?.kind === 'day_off'
                            ? 'დასვენების დღეს მუშაობა'
                            : 'არასამუშაო დღეს მუშაობა',
                    canClose: () => !submitting.current,
                  },
                )
              } else if (!open) void action.start()
              else {
                openModal(
                  <FinishWorkConfirmation
                    oldSession={oldSession}
                    needsReview={needsReview}
                    workDate={open.workDate}
                    workedSeconds={initialSeconds}
                    clockStartedAt={
                      sampleReceivedAt.current ?? performance.now()
                    }
                    remainingSeconds={elapsedSeconds(
                      overview.serverNow,
                      open.expectedEndAt,
                    )}
                    finish={() => action.finish(true)}
                    submitting={submitting}
                  />,
                  {
                    title: 'სამუშაოს დასრულება',
                    canClose: () => !submitting.current,
                  },
                )
              }
            }}
          >
            {open ? <WorkCurrent /> : null}
            <span className="relative flex size-4 items-center justify-center">
              {action.pending ? (
                <Spinner aria-hidden="true" />
              ) : open ? (
                <IconCirclePause aria-hidden="true" />
              ) : (
                <IconCirclePlay aria-hidden="true" />
              )}
            </span>
            <span className="relative">
              {open ? 'სამუშაოს დასრულება' : 'სამუშაოს დაწყება'}
            </span>
          </Button>
          {!workLog && overview.workday.kind === 'day_off' ? (
            <Badge variant="secondary" className="relative">
              არასამუშაო დღე
            </Badge>
          ) : null}
        </div>
        <div
          className={cn(
            'flex flex-wrap gap-4 text-sm text-muted-foreground',
            workLog && 'order-2 flex-col lg:border-l lg:pl-6',
          )}
        >
          {workLog ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>დღევანდელი განრიგი</span>
              <span className="font-medium text-foreground tabular-nums">
                {overview.approvedLeave
                  ? 'სამუშაო მიზანი არ არის განსაზღვრული'
                  : overview.workday.kind === 'scheduled'
                    ? `${overview.workday.start} - ${overview.workday.end}`
                    : overview.workday.kind === 'day_off'
                      ? 'არასამუშაო დღე'
                      : 'განრიგი არ არის განსაზღვრული'}
              </span>
            </div>
          ) : null}
          <div
            className={cn(
              workLog
                ? 'flex flex-wrap items-center gap-x-4 gap-y-2'
                : 'contents',
            )}
          >
            <span>
              შესვლა:{' '}
              {firstIn
                ? formatAttendanceTime(
                    firstIn,
                    open?.timezone ?? overview.workday.timezone,
                  )
                : 'ჯერ არ დაფიქსირებულა'}
            </span>
            {overview.today?.lastOut ? (
              <span>
                გასვლა:{' '}
                {formatAttendanceTime(
                  overview.today.lastOut,
                  overview.today.timezone,
                )}
              </span>
            ) : null}
            {activeDay ? <AttendanceDeviationBadges {...activeDay} /> : null}
          </div>
        </div>
        {oldSession || needsReview ? (
          <Alert
            className={cn(workLog && 'order-4 lg:col-span-3')}
            variant={needsReview ? 'destructive' : 'default'}
          >
            <AlertDescription>
              {needsReview
                ? `ჩანაწერი ღიაა სულ მცირე ${open.maxOpenHours} საათი და საჭიროებს ხელმძღვანელის გადამოწმებას. დროის აღრიცხვა გრძელდება.`
                : 'სამუშაო წინა დღეს დაიწყო. დრო ეკუთვნის დაწყების სამუშაო დღეს და აღრიცხვა გრძელდება დასრულებამდე.'}
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function ClockTimer({
  seconds,
  running,
  onStart,
  compact = false,
  workLog = false,
  showWorkTarget = true,
}: {
  seconds: number
  running: boolean
  onStart?: (startedAt: number) => void
  compact?: boolean
  workLog?: boolean
  showWorkTarget?: boolean
}) {
  const total = seconds + useElapsedSeconds(running, undefined, onStart)
  const durationStatus = workDurationStatus(total)
  const values = [
    Math.floor(total / 3600),
    Math.floor(total / 60) % 60,
    total % 60,
  ]
  if (workLog)
    return (
      <div
        role="timer"
        aria-live="off"
        aria-label="ნამუშევარი დრო"
        className="flex flex-col items-start gap-2"
      >
        <span className="sr-only">{formatWorkedTime(total)}</span>
        <span
          aria-hidden="true"
          className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl"
        >
          {values.map((value) => String(value).padStart(2, '0')).join(':')}
        </span>
        {showWorkTarget ? (
          <Badge variant={durationStatus.variant}>{durationStatus.label}</Badge>
        ) : null}
      </div>
    )
  return (
    <div
      className={cn(
        'relative flex flex-col items-center',
        compact ? 'gap-3 @lg/clock:gap-4' : 'gap-2',
      )}
      role="timer"
      aria-live="off"
      aria-label="ნამუშევარი დრო"
    >
      <span className="sr-only">{formatWorkedTime(total)}</span>
      <div aria-hidden="true" className="flex items-start gap-3 py-3 sm:gap-5">
        {values.map((value, index) => (
          <div key={index} className="flex items-start gap-3 sm:gap-5">
            {index > 0 ? (
              <span
                className={cn(
                  'pt-1 text-4xl text-muted-foreground',
                  compact ? 'sm:text-6xl @lg/clock:text-7xl' : 'sm:text-6xl',
                )}
              >
                :
              </span>
            ) : null}
            <div className="flex flex-col items-center">
              <ChartStatFlow
                value={value}
                label={['საათი', 'წუთი', 'წამი'][index]}
                formatOptions={digitFormat}
                valueClassName={cn(
                  'text-4xl font-semibold tracking-tight',
                  compact ? 'sm:text-6xl @lg/clock:text-7xl' : 'sm:text-6xl',
                )}
                labelClassName={cn(
                  'text-xs text-muted-foreground',
                  compact && '@lg/clock:text-sm',
                )}
              />
            </div>
          </div>
        ))}
      </div>
      {showWorkTarget ? (
        <Badge variant={durationStatus.variant}>{durationStatus.label}</Badge>
      ) : null}
    </div>
  )
}
