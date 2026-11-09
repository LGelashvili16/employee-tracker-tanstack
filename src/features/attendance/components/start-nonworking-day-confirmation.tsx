import { useState } from 'react'
import type { RefObject } from 'react'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { useModal } from '#/hooks/use-modal'

export function StartNonworkingDayConfirmation({
  start,
  submitting,
}: {
  start: () => Promise<boolean>
  submitting: RefObject<boolean>
}) {
  const { closeModal } = useModal()
  const [pending, setPending] = useState(false)
  async function confirm() {
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    try {
      const success = await start()
      submitting.current = false
      if (success) closeModal()
    } finally {
      submitting.current = false
      setPending(false)
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        დღეს თქვენი განრიგით არასამუშაო დღეა. დაწყების შემთხვევაში დრო
        აღირიცხება განრიგის გარეთ მუშაობად და საჭიროებს ხელმძღვანელის განხილვას.
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          depth="raised"
          disabled={pending}
          onClick={closeModal}
        >
          გაუქმება
        </Button>
        <Button
          className="min-w-40"
          depth="raised"
          disabled={pending}
          aria-busy={pending}
          onClick={() => void confirm()}
        >
          {pending ? (
            <Spinner data-icon="inline-start" aria-hidden="true" />
          ) : null}
          მუშაობის დაწყება
        </Button>
      </div>
    </div>
  )
}
