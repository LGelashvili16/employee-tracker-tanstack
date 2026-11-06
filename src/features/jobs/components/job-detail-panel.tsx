import { useQuery } from '@tanstack/react-query'
import { IconArrowLeft, IconRefresh } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { jobQueryOptions } from '../jobs.queries'
import { JobDetails } from './job-details'
import type { Actor } from '#/lib/authorization/actor'

export function JobDetailSkeleton() {
  return (
    <div className="space-y-4 p-5" role="status" aria-busy="true">
      <span className="sr-only">სამუშაო იტვირთება</span>
      <div aria-hidden="true" className="space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
export function JobDetailPanel({
  actor,
  id,
  onClose,
}: {
  actor: Actor
  id: string
  onClose: () => void
}) {
  const query = useQuery(jobQueryOptions(actor.id, id))
  return (
    <section
      aria-label="სამუშაოს დეტალები"
      className="flex h-full min-w-0 flex-col"
    >
      <div className="border-b p-4">
        <Button variant="outline" depth="raised" onClick={onClose}>
          <IconArrowLeft aria-hidden="true" />
          სამუშაოების სია
        </Button>
      </div>
      {query.isPending ? (
        <JobDetailSkeleton />
      ) : query.isError ? (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTitle>სამუშაო ვერ ჩაიტვირთა</AlertTitle>
            <AlertDescription>
              სამუშაო შეიძლება აღარ იყოს ხელმისაწვდომი. გადაამოწმეთ წვდომა და
              სცადეთ ხელახლა.
            </AlertDescription>
            <Button
              variant="outline"
              depth="raised"
              className="mt-3"
              disabled={query.isFetching}
              aria-busy={query.isFetching}
              onClick={async () => {
                const result = await query.refetch()
                if (result.isError)
                  toast.error('სამუშაო ვერ ჩაიტვირთა. სცადეთ ხელახლა.')
                else toast.success('სამუშაო განახლებულია.')
              }}
            >
              {query.isFetching ? (
                <Spinner aria-hidden="true" />
              ) : (
                <IconRefresh aria-hidden="true" />
              )}
              ხელახლა ცდა
            </Button>
          </Alert>
        </div>
      ) : (
        <JobDetails key={query.data.id} job={query.data} actor={actor} />
      )}
    </section>
  )
}
