import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { IconRefresh } from '@tabler/icons-react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { jobQueryOptions } from '../jobs.queries'
import { jobKinds, jobStatuses } from '../jobs.presentation'
import { hasJobCoordinates } from '../jobs.rules'
import type { JobDetail } from '../jobs.types'

/** A conflict never silently rebases a draft. Users review current information before applying retained edits. */
export function JobConflictReview({
  actorId,
  id,
  canContinue,
  onReviewed,
}: {
  actorId: string
  id: string
  canContinue: (job: JobDetail) => boolean
  onReviewed: (job: JobDetail) => void
}) {
  const client = useQueryClient()
  const [latest, setLatest] = useState<JobDetail | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <Alert variant="info" className="mt-4">
      <AlertTitle>სამუშაო სხვა მომხმარებელმა შეცვალა</AlertTitle>
      <AlertDescription>
        თქვენი შეყვანილი მონაცემები შენარჩუნებულია. გაგრძელებამდე გადახედეთ
        მიმდინარე ინფორმაციას.
      </AlertDescription>
      <Button
        className="mt-3 h-auto min-h-9 w-full"
        style={{ whiteSpace: 'normal' }}
        type="button"
        variant="outline"
        depth="raised"
        disabled={pending}
        aria-busy={pending}
        onClick={async () => {
          setPending(true)
          try {
            const record = await client.fetchQuery({
              ...jobQueryOptions(actorId, id),
              staleTime: 0,
            })
            setLatest(record)
            toast.success('მიმდინარე ინფორმაცია ჩატვირთულია.')
          } catch {
            toast.error('ინფორმაცია ვერ ჩაიტვირთა. სცადეთ ხელახლა.')
          } finally {
            setPending(false)
          }
        }}
      >
        {pending ? (
          <Spinner aria-hidden="true" />
        ) : (
          <IconRefresh aria-hidden="true" />
        )}
        მიმდინარე ინფორმაციის ჩატვირთვა
      </Button>
      {latest ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border bg-background p-3">
            <p className="font-medium break-words">{latest.title}</p>
            <p>
              {jobStatuses[latest.status].label} · {jobKinds[latest.kind].label}
            </p>
            <p>{latest.assigneeName ?? 'პასუხისმგებელი არ არის მინიჭებული'}</p>
            <p className="break-words">
              {latest.address || 'მისამართი არ არის მითითებული'}
            </p>
            <p>
              {hasJobCoordinates(latest)
                ? `${latest.latitude}, ${latest.longitude}`
                : 'ზუსტი მდებარეობა არ არის მითითებული'}
            </p>
            <p className="whitespace-pre-wrap break-words">
              {latest.notes || 'შენიშვნა არ არის დამატებული.'}
            </p>
          </div>
          {canContinue(latest) ? (
            <Button
              type="button"
              variant="outline"
              depth="raised"
              className="h-auto min-h-9 whitespace-normal"
              onClick={() => onReviewed(latest)}
            >
              გადავხედე, ჩემი ცვლილებებით გაგრძელება
            </Button>
          ) : (
            <p>
              ეს მოქმედება მიმდინარე სტატუსისთვის აღარ არის ხელმისაწვდომი.
              დაბრუნდით სამუშაოს დეტალებზე.
            </p>
          )}
        </div>
      ) : null}
    </Alert>
  )
}
