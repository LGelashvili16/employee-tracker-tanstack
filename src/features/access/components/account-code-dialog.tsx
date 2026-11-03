import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import type { IssuedAccountCode } from '../access.types'

export function AccountCodeDialog({
  value,
  onClose,
}: {
  value: IssuedAccountCode | null
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )
  async function copy() {
    if (!value) return
    setPending(true)
    try {
      await navigator.clipboard.writeText(value.code)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog
      open={!!value}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
          setCopyState('idle')
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            ერთჯერადი{' '}
            {value?.purpose === 'activation' ? 'გააქტიურების' : 'აღდგენის'} კოდი
          </DialogTitle>
          <DialogDescription>
            კოდი მხოლოდ ახლა ჩანს. გადასცით თანამშრომელს პირადად, მისი ვინაობის
            გადამოწმების შემდეგ. ახალი კოდის გაცემა წინა კოდს გააუქმებს.
          </DialogDescription>
        </DialogHeader>
        <code className="break-all rounded-lg border bg-muted p-3 text-sm select-all">
          {value?.code}
        </code>
        {value ? (
          <p className="text-xs text-muted-foreground">
            მოქმედებს:{' '}
            {new Date(value.expiresAt).toLocaleString('ka-GE', {
              timeZone: 'UTC',
            })}{' '}
            UTC
          </p>
        ) : null}
        <p className="text-sm leading-6">
          თანამშრომელმა უნდა გახსნას{' '}
          {value?.purpose === 'activation'
            ? 'ანგარიშის გააქტიურების'
            : 'პაროლის აღდგენის'}{' '}
          გვერდი და თავად აირჩიოს პაროლი.
        </p>
        {copyState !== 'idle' ? (
          <p role="status" className="text-sm">
            {copyState === 'copied'
              ? 'კოდი დაკოპირებულია.'
              : 'კოპირება ვერ მოხერხდა. მონიშნეთ და დააკოპირეთ კოდი.'}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            onClick={() => void copy()}
            disabled={pending}
            aria-busy={pending}
          >
            <span className="flex size-4 items-center justify-center">
              {pending ? <Spinner aria-hidden="true" /> : null}
            </span>
            კოპირება
          </Button>
          <DialogClose render={<Button variant="outline" />}>
            დახურვა
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
