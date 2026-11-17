import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '#/components/ui/dialog'
import { withdrawLeave } from '../leave.functions'
import { cancelLeaveSchema } from '../leave.schemas'
import { leaveKey } from '../leave.queries'
import {
  formatLeaveDate,
  formatLeaveEndDate,
  kindLabels,
} from '../leave.presentation'
import type { LeaveItem } from '../leave.types'

export function CancelLeaveDialog({ item }: { item: LeaveItem }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const cancel = useServerFn(withdrawLeave)
  const client = useQueryClient()
  async function confirm() {
    if (pending) return
    setPending(true)
    setError('')
    try {
      const data = cancelLeaveSchema.parse({
        id: item.id,
        revision: item.revision,
      })
      const result = await cancel({ data })
      if (!result.ok) {
        setError(result.message)
        toast.error(result.message)
        void client.invalidateQueries({ queryKey: leaveKey })
        return
      }
      toast.success('მოთხოვნა გაუქმებულია.')
      setOpen(false)
      void client.invalidateQueries({ queryKey: leaveKey })
    } catch {
      const message = 'მოთხოვნა ვერ გაუქმდა. განაახლეთ სია და სცადეთ ხელახლა.'
      setError(message)
      toast.error(message)
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) {
          setOpen(next)
          setError('')
        }
      }}
    >
      <DialogTrigger
        render={<Button size="sm" variant="outline" depth="raised" />}
      >
        გაუქმება
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>მოთხოვნის გაუქმება</DialogTitle>
          <DialogDescription>
            {kindLabels[item.kind]}: {formatLeaveDate(item.startDate)}
            {item.endDate !== item.startDate
              ? ` / ${formatLeaveEndDate(item.endDate)}`
              : ''}
            . გაუქმებული მოთხოვნა აღარ განიხილება. საჭიროების შემთხვევაში
            შეძლებთ ახალი მოთხოვნის გაგზავნას.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            depth="raised"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            დატოვება
          </Button>
          <Button
            variant="destructive"
            depth="raised"
            disabled={pending}
            aria-busy={pending}
            onClick={() => void confirm()}
          >
            {pending ? <Spinner aria-hidden="true" /> : null}მოთხოვნის გაუქმება
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
