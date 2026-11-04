import { useRef } from 'react'
import { IconClock, IconLogin, IconLogout } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { useModal } from '#/hooks/use-modal'
import { FinishWorkConfirmation } from './finish-work-confirmation'
import { ChartStatFlow } from '#/components/charts/chart-stat-flow'
import { useAttendanceActions } from '../hooks/use-attendance-actions'
import { useElapsedSeconds } from '../hooks/use-elapsed-seconds'
import {
  elapsedSeconds,
  formatAttendanceDuration,
  formatAttendanceTime,
  formatWorkedTime,
} from '../attendance.rules'
import type { AttendanceOverview } from '../attendance.types'
import { attendanceStatus } from '../attendance.presentation'

const digitFormat = { minimumIntegerDigits: 2, maximumFractionDigits: 0 }

export function AttendanceClock({
  overview,
  actorId,
}: {
  overview: AttendanceOverview
  actorId: string
}) {
  const action = useAttendanceActions(actorId, overview)
  const { openModal } = useModal()
  const submitting = useRef(false)
  const open = overview.openSession
  const status = attendanceStatus(overview)
  const oldSession = open !== null && open.workDate !== overview.workday.date
  const early =
    open !== null &&
    Date.parse(overview.serverNow) < Date.parse(open.expectedEndAt)
  const late = overview.today?.lateSeconds ?? 0
  const firstIn = oldSession ? open.startedAt : overview.today?.firstIn
  const initialSeconds = oldSession
    ? elapsedSeconds(open.startedAt, overview.serverNow)
    : (overview.today?.seconds ?? 0)

  return (
    <Card className="h-full rounded-2xl shadow-sm [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IconClock className="size-5" aria-hidden="true" />
          </span>
          {oldSession ? 'ღია ჩანაწერის დრო' : 'დღეს ნამუშევარი'}
        </CardTitle>
        <Badge variant={status.variant}>{status.label}</Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border/60 bg-muted/30 px-3 py-7 sm:py-10">
          <ClockTimer
            key={`${overview.serverNow}:${open?.id ?? 'stopped'}`}
            seconds={initialSeconds}
            running={open !== null}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
          {late > 0 ? (
            <Badge variant="orange">
              დაგვიანება: {formatAttendanceDuration(late)}
            </Badge>
          ) : null}
          {(overview.today?.earlySeconds ?? 0) > 0 ? (
            <Badge variant="yellow">
              ადრე გასვლა:{' '}
              {formatAttendanceDuration(overview.today?.earlySeconds ?? 0)}
            </Badge>
          ) : null}
        </div>
        {oldSession ? (
          <Alert variant="destructive">
            <AlertDescription>
              წინა სამუშაო დღის ჩანაწერი ღიაა. დასრულების დრო დაფიქსირდება ახლა.
              დროის შესწორების მოთხოვნები ჯერ მიუწვდომელია.
            </AlertDescription>
          </Alert>
        ) : null}
        <Button
          className="h-11 w-full sm:w-auto sm:self-start"
          disabled={
            action.pending || (!open && overview.workday.kind !== 'scheduled')
          }
          aria-busy={action.pending}
          onClick={() => {
            if (!open) void action.start()
            else if (early || oldSession) {
              openModal(
                <FinishWorkConfirmation
                  oldSession={oldSession}
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
            } else void action.finish(false)
          }}
        >
          <span className="flex size-4 items-center justify-center">
            {action.pending ? (
              <Spinner aria-hidden="true" />
            ) : open ? (
              <IconLogout aria-hidden="true" />
            ) : (
              <IconLogin aria-hidden="true" />
            )}
          </span>
          {open ? 'სამუშაოს დასრულება' : 'სამუშაოს დაწყება'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function ClockTimer({
  seconds,
  running,
}: {
  seconds: number
  running: boolean
}) {
  const total = seconds + useElapsedSeconds(running)
  const values = [
    Math.floor(total / 3600),
    Math.floor(total / 60) % 60,
    total % 60,
  ]
  return (
    <div role="timer" aria-live="off" aria-label="ნამუშევარი დრო">
      <span className="sr-only">{formatWorkedTime(total)}</span>
      <div aria-hidden="true" className="flex items-start gap-3 py-3 sm:gap-5">
        {values.map((value, index) => (
          <div key={index} className="flex items-start gap-3 sm:gap-5">
            {index > 0 ? (
              <span className="pt-1 text-4xl text-muted-foreground sm:text-6xl">
                :
              </span>
            ) : null}
            <div className="flex flex-col items-center">
              <ChartStatFlow
                value={value}
                label={['საათი', 'წუთი', 'წამი'][index]}
                formatOptions={digitFormat}
                valueClassName="text-4xl font-semibold tracking-tight sm:text-6xl"
                labelClassName="text-xs text-muted-foreground"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
