import { useState } from 'react'
import type { RefObject } from 'react'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { useModal } from '#/hooks/use-modal'
import type { ApprovedLeave } from '#/features/leave/leave.types'

export function StartNonworkingDayConfirmation({
  start,
  submitting,
  leaveKind,
}: {
  start: () => Promise<boolean>
  submitting: RefObject<boolean>
  leaveKind?: ApprovedLeave['kind']
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
        {leaveKind
          ? `${leaveKind === 'sick_leave' ? 'დღეს ბიულეტენზე ხართ.' : leaveKind === 'vacation' ? 'დღეს შვებულებაში ხართ.' : 'დღეს დასვენების დღე გაქვთ.'} გსურთ მუშაობის დაწყება? გაგრძელების შემთხვევაში სამუშაო დრო აღირიცხება.`
          : 'დღეს თქვენი განრიგით არასამუშაო დღეა. დაწყების შემთხვევაში დრო აღირიცხება განრიგის გარეთ მუშაობად და საჭიროებს ხელმძღვანელის განხილვას.'}
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
          <span className="flex size-4 shrink-0 items-center justify-center">
            {pending ? <Spinner aria-hidden="true" /> : null}
          </span>
          მუშაობის დაწყება
        </Button>
      </div>
    </div>
  )
}
