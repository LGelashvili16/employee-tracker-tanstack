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
import { AttendanceCorrectionSheet } from './attendance-correction-sheet'
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
  const canCorrect = session.canCorrect
  if (!session.canReview && !canCorrect) return null
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {session.canReview ? (
          <Button
            variant="outline"
            depth="raised"
            onClick={() => setMode('review')}
            disabled={!session.endedAt || session.reviewState !== 'pending'}
          >
            განხილვა
          </Button>
        ) : null}
        {canCorrect ? (
          <Button
            variant="outline"
            depth="raised"
            onClick={() => setMode('correct')}
          >
            შესწორება
          </Button>
        ) : null}
      </div>
      <AttendanceCorrectionSheet
        session={session}
        open={mode === 'correct'}
        onClose={() => setMode(null)}
      />
      <Dialog
        open={mode === 'review'}
        onOpenChange={(open) => {
          if (!open && !busy) setMode(null)
        }}
      >
        <DialogContent
          showCloseButton={!busy}
          className="max-h-[90svh] overflow-y-auto sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>დასწრების განხილვა</DialogTitle>
            <DialogDescription>
              {session.employeeName}, {session.workDate}
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
          {mode === 'review' ? (
            <AttendanceReviewForm
              key={`${session.id}:${session.revision}`}
              session={session}
              close={() => setMode(null)}
              onPending={setBusy}
            />
          ) : null}
          {mode === 'review' ? (
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
