import { IconClockPlus } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { useState } from 'react'
import { ManualAttendanceForm } from '#/features/attendance/components/manual-attendance-form'

export function AssistedClockSheet({
  userId,
  employeeName,
  timezone,
  serverNow,
}: {
  userId: string
  employeeName: string
  timezone: string
  serverNow: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!busy) setOpen(next)
      }}
    >
      <SheetTrigger render={<Button variant="outline" />}>
        <IconClockPlus aria-hidden="true" />
        დასწრების აღრიცხვა
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={!busy}
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl motion-reduce:transition-none"
        aria-describedby={undefined}
      >
        <SheetHeader className="shrink-0 border-b p-6 pr-12">
          <SheetTitle>დასწრების აღრიცხვა</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {open ? (
            <ManualAttendanceForm
              userId={userId}
              employeeName={employeeName}
              timezone={timezone}
              serverNow={serverNow}
              onPending={setBusy}
              close={() => setOpen(false)}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
