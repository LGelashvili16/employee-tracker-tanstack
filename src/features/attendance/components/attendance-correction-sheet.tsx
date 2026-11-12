import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { AttendanceCorrectionForm } from './attendance-correction-form'
import { AttendanceReviewHistory } from './attendance-review-history'
import type { ReviewSession } from '../attendance.types'

export function AttendanceCorrectionSheet({
  session,
  open,
  onClose,
}: {
  session: ReviewSession
  open: boolean
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose()
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={!busy}
        aria-describedby={undefined}
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl motion-reduce:transition-none"
      >
        <SheetHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <SheetTitle>დროის შესწორება</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          {open ? (
            <>
              <AttendanceCorrectionForm
                key={`${session.id}:${session.revision}`}
                session={session}
                close={onClose}
                onPending={setBusy}
              />
              <Card>
                <CardHeader>
                  <CardTitle>ცვლილებების ისტორია</CardTitle>
                </CardHeader>
                <CardContent>
                  <AttendanceReviewHistory
                    sessionId={session.id}
                    timezone={session.timezone}
                    embedded
                  />
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
