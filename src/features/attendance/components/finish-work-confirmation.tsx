import { useState } from 'react'
import { IconAlertTriangle, IconClock } from '@tabler/icons-react'
import type { RefObject } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { useModal } from '#/hooks/use-modal'
import { formatGeorgianDate } from '#/lib/date-format'
import { formatAttendanceDuration, formatWorkedTime } from '../attendance.rules'
import { workDurationStatus } from '../attendance.presentation'
import { useElapsedSeconds } from '../hooks/use-elapsed-seconds'

export function FinishWorkConfirmation({
  oldSession,
  needsReview = false,
  workDate,
  workedSeconds,
  clockStartedAt,
  remainingSeconds,
  finish,
  submitting,
}: {
  oldSession: boolean
  needsReview?: boolean
  workDate?: string
  workedSeconds: number
  clockStartedAt: number
  remainingSeconds: number
  finish: () => Promise<boolean>
  submitting: RefObject<boolean>
}) {
  const { closeModal } = useModal()
  const [pending, setPending] = useState(false)
  const elapsed = useElapsedSeconds(true, clockStartedAt)
  const totalSeconds = workedSeconds + elapsed
  const remaining = Math.max(0, remainingSeconds - elapsed)
  const durationStatus = workDurationStatus(totalSeconds)
  const early = remaining > 0

  async function confirm() {
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    try {
      const success = await finish()
      submitting.current = false
      if (success) closeModal()
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4 rounded-xl border bg-muted/30 p-4 sm:p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          {oldSession ? (
            <IconAlertTriangle className="size-6" aria-hidden="true" />
          ) : (
            <IconClock className="size-6" aria-hidden="true" />
          )}
        </span>
        <div className="flex min-w-0 flex-col items-start gap-3">
          <Badge variant={needsReview ? 'red' : early ? 'yellow' : 'secondary'}>
            {oldSession
              ? 'წინა დღეს დაწყებული'
              : early
                ? 'ადრე დასრულება'
                : 'სამუშაოს დასრულება'}
          </Badge>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {oldSession
                ? `${workDate ? formatGeorgianDate(workDate) : ''} დღის აღრიცხული დრო`
                : 'დღეს აღრიცხული დრო'}
            </span>
            <span
              role="timer"
              aria-live="off"
              aria-label="დასრულებამდე აღრიცხული დრო"
              className="text-3xl font-semibold tracking-tight tabular-nums"
            >
              {formatWorkedTime(totalSeconds)}
            </span>
            <Badge variant={durationStatus.variant}>
              {durationStatus.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              მიზანი: 8 სთ მუშაობა + 1 სთ შესვენება
            </span>
          </div>
          {oldSession ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              ღია ჩანაწერი დასრულდება მიმდინარე დროით. დრო სრულად მიეკუთვნება
              დაწყების სამუშაო დღეს.
            </p>
          ) : early ? (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                  {formatAttendanceDuration(remaining)}
                </span>
                <span className="text-xs text-muted-foreground">
                  დაგეგმილ დასრულებამდე დარჩენილი დრო
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                გასვლა აღირიცხება ადრე დასრულებად.
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              დაადასტურეთ სამუშაოს დასრულება. გასვლის დრო დაფიქსირდება
              დადასტურებისას.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
        <Button
          className="h-11 sm:min-w-28"
          variant="outline"
          disabled={pending}
          onClick={closeModal}
        >
          გაუქმება
        </Button>
        <Button
          className="relative h-11 px-10 sm:min-w-40"
          disabled={pending}
          aria-busy={pending}
          onClick={() => void confirm()}
        >
          {pending ? (
            <Spinner className="absolute left-4" aria-hidden="true" />
          ) : null}
          დასრულება
        </Button>
      </div>
    </div>
  )
}
