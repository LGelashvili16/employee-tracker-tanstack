import { useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'
import { AttendanceReviewForm } from './attendance-review-form'
import { AttendanceCorrectionForm } from './attendance-correction-form'
import { AttendanceReviewHistory } from './attendance-review-history'
import {
  elapsedSeconds,
  formatAttendanceLocalInput,
  formatWorkedTime,
} from '../attendance.rules'
import type { ReviewSession } from '../attendance.types'

export function AttendanceReviewDialog({
  session,
}: {
  session: ReviewSession
}) {
  const [mode, setMode] = useState<'review' | 'correct' | null>(null)
  const [busy, setBusy] = useState(false)
  if (!session.canReview) return null
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          depth="raised"
          onClick={() => setMode('review')}
          disabled={!session.endedAt || session.reviewState !== 'pending'}
        >
          განხილვა
        </Button>
        <Button
          variant="outline"
          depth="raised"
          onClick={() => setMode('correct')}
        >
          შესწორება
        </Button>
      </div>
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setMode(null)
        }}
      >
        <DialogContent
          showCloseButton={!busy}
          className="max-h-[90svh] overflow-y-auto sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>
              {mode === 'correct' ? 'დროის შესწორება' : 'დასწრების განხილვა'}
            </DialogTitle>
            <DialogDescription>
              {session.employeeName}, {session.workDate}, {session.timezone}
            </DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
            <div>
              <dt className="text-muted-foreground">მიმდინარე შესვლა</dt>
              <dd className="tabular-nums">
                {formatAttendanceLocalInput(
                  session.startedAt,
                  session.timezone,
                ).replace('T', ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">მიმდინარე გასვლა</dt>
              <dd className="tabular-nums">
                {session.endedAt
                  ? formatAttendanceLocalInput(
                      session.endedAt,
                      session.timezone,
                    ).replace('T', ' ')
                  : 'მიმდინარე'}
              </dd>
            </div>
            {session.endedAt ? (
              <div>
                <dt className="text-muted-foreground">აღრიცხული დრო</dt>
                <dd className="tabular-nums">
                  {formatWorkedTime(
                    elapsedSeconds(session.startedAt, session.endedAt),
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="text-sm text-muted-foreground">
            თავდაპირველი შესვლა:{' '}
            {session.originalStartedAt
              ? formatAttendanceLocalInput(
                  session.originalStartedAt,
                  session.timezone,
                ).replace('T', ' ')
              : 'არ არის აღრიცხული'}
            . თავდაპირველი გასვლა:{' '}
            {session.originalEndedAt
              ? formatAttendanceLocalInput(
                  session.originalEndedAt,
                  session.timezone,
                ).replace('T', ' ')
              : 'არ არის აღრიცხული'}
            .
          </p>
          {mode === 'correct' ? (
            <AttendanceCorrectionForm
              key={`${session.id}:${session.revision}`}
              session={session}
              close={() => setMode(null)}
              onPending={setBusy}
            />
          ) : mode === 'review' ? (
            <AttendanceReviewForm
              key={`${session.id}:${session.revision}`}
              session={session}
              close={() => setMode(null)}
              onPending={setBusy}
            />
          ) : null}
          {mode ? (
            <AttendanceReviewHistory
              sessionId={session.id}
              timezone={session.timezone}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
