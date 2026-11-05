import { useState } from 'react'
import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  IconCheck,
  IconClockHour4,
  IconCopy,
  IconKey,
  IconShieldLock,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
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
import { formatSetupCode, setupCodeLifetimeMinutes } from '../access.rules'
import { AccountCodeSteps } from './account-code-steps'
import type { IssuedAccountCode } from '../access.types'

const titles = {
  activation: 'გააქტიურების კოდი მზადაა',
  reset: 'პაროლის აღდგენის კოდი მზადაა',
} as const

function formatLifetime(minutes: number) {
  return minutes >= 60 ? `${minutes / 60} საათი` : `${minutes} წუთი`
}

function formatExpiry(expiresAt: string) {
  return format(new Date(expiresAt), 'd MMMM, HH:mm', { locale: ka })
}

export function AccountCodeDialog({
  value,
  onClose,
}: {
  value: IssuedAccountCode | null
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const displayCode = value ? formatSetupCode(value.code) : ''

  async function copy() {
    if (!value) return
    setPending(true)
    try {
      await navigator.clipboard.writeText(displayCode)
      setCopied(true)
      toast.success('კოდი დაკოპირებულია.')
    } catch {
      toast.error('კოპირება ვერ მოხერხდა. მონიშნეთ და დააკოპირეთ კოდი ხელით.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={!!value} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="gap-5 sm:max-w-md">
        <DialogHeader className="items-center gap-3 pt-2 text-center">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <IconKey className="size-6" />
          </span>
          <DialogTitle className="text-lg">
            {titles[value?.purpose ?? 'activation']}
          </DialogTitle>
          <DialogDescription>
            კოდი მხოლოდ ახლა ჩანს და მეორედ ვეღარ გამოჩნდება.
          </DialogDescription>
        </DialogHeader>
        {value ? (
          <>
            <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/40 px-4 py-5">
              <code
                aria-label={`ერთჯერადი კოდი: ${displayCode}`}
                className="font-mono text-2xl font-semibold tracking-widest select-all sm:text-3xl"
              >
                {displayCode}
              </code>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="secondary">
                  <IconShieldLock aria-hidden="true" data-icon="inline-start" />
                  ერთჯერადი
                </Badge>
                <Badge variant="secondary">
                  <IconClockHour4 aria-hidden="true" data-icon="inline-start" />
                  ვადა:{' '}
                  {formatLifetime(setupCodeLifetimeMinutes[value.purpose])}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                გაუქმდება: {formatExpiry(value.expiresAt)}
              </p>
            </div>
            <AccountCodeSteps purpose={value.purpose} />
            <Separator />
            <p className="text-xs leading-5 text-muted-foreground">
              ახალი კოდის გაცემა წინა კოდს გააუქმებს.
            </p>
          </>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            დახურვა
          </DialogClose>
          <Button
            onClick={() => void copy()}
            disabled={pending}
            aria-busy={pending}
          >
            <span className="flex size-4 items-center justify-center">
              {pending ? (
                <Spinner aria-hidden="true" />
              ) : copied ? (
                <IconCheck aria-hidden="true" />
              ) : (
                <IconCopy aria-hidden="true" />
              )}
            </span>
            {copied ? 'დაკოპირდა' : 'კოდის კოპირება'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
