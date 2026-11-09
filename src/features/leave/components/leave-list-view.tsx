import { OwnDayOffBalance } from './day-off-allowance-card'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { DataPagination } from '#/components/common/data-pagination'
import { leaveListQuery } from '../leave.queries'
import type { LeaveSearch as Search } from '../leave.schemas'
import type { LeaveItem } from '../leave.types'
import { LeaveSearch } from './leave-search'
import { LeaveTable } from './leave-table'
import { LeaveRequestForm } from './leave-request-form'
import { LeaveReviewForm } from './leave-review-form'

export function LeaveListView({
  actorId,
  search,
  review = false,
  onChange,
}: {
  actorId: string
  search: Search
  review?: boolean
  onChange: (search: Search, replace: boolean) => void
}) {
  const query = useQuery(leaveListQuery(actorId, search, review))
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<LeaveItem | null>(null)
  async function refresh() {
    const result = await query.refetch()
    if (result.isError)
      toast.error('სია ვერ განახლდა. გადაამოწმეთ წვდომა და სცადეთ ხელახლა.')
    else toast.success('მოთხოვნების სია განახლდა.')
  }
  const filtered = Boolean(
    search.q || (search.status && search.status !== 'all'),
  )
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {review
            ? 'შვებულებისა და არყოფნის განხილვა'
            : 'ჩემი შვებულება და არყოფნა'}
        </h1>
        {!review ? (
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger render={<Button />}>ახალი მოთხოვნა</DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>ახალი მოთხოვნა</DialogTitle>
              </DialogHeader>
              <LeaveRequestForm onSaved={() => setCreating(false)} />
            </DialogContent>
          </Dialog>
        ) : null}
      </header>
      {!review ? <OwnDayOffBalance actorId={actorId} /> : null}
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-4">
          <LeaveSearch search={search} onChange={onChange} />
        </div>
        <div aria-busy={query.isFetching}>
          {query.isPending ? (
            <div role="status" aria-busy="true" className="p-4">
              <span className="sr-only">მოთხოვნები იტვირთება</span>
              <div aria-hidden="true" className="flex flex-col gap-4">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton
                    key={row}
                    className="h-12 w-full motion-reduce:animate-none"
                  />
                ))}
              </div>
            </div>
          ) : query.isError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription>
                  მოთხოვნები ვერ ჩაიტვირთა. გადაამოწმეთ წვდომა და სცადეთ
                  ხელახლა.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                depth="raised"
                className="mt-4"
                disabled={query.isFetching}
                aria-busy={query.isFetching}
                onClick={() => void refresh()}
              >
                {query.isFetching ? <Spinner aria-hidden="true" /> : null}
                ხელახლა ცდა
              </Button>
            </div>
          ) : (
            <>
              {query.data.items.length ? (
                <LeaveTable
                  items={query.data.items}
                  actorId={actorId}
                  review={review}
                  onReview={setSelected}
                />
              ) : (
                <div
                  role="status"
                  className="flex flex-col items-center gap-4 px-4 py-12 text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    {(search.page ?? 1) > 1
                      ? 'ამ გვერდზე მოთხოვნები არ არის.'
                      : filtered
                        ? 'შესაბამისი მოთხოვნები ვერ მოიძებნა.'
                        : 'მოთხოვნები ჯერ არ არის.'}
                  </p>
                  {(search.page ?? 1) > 1 ? (
                    <Button
                      variant="outline"
                      depth="raised"
                      onClick={() => onChange({ ...search, page: 1 }, false)}
                    >
                      პირველ გვერდზე დაბრუნება
                    </Button>
                  ) : null}
                </div>
              )}
              <div className="border-t px-4 py-3">
                <DataPagination
                  page={search.page ?? 1}
                  total={query.data.total}
                  pageSize={query.data.pageSize}
                  renderLink={(page) =>
                    review ? (
                      <Link to="/manage/leave" search={{ ...search, page }} />
                    ) : (
                      <Link to="/leave" search={{ ...search, page }} />
                    )
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>მოთხოვნის განხილვა</DialogTitle>
          </DialogHeader>
          {selected ? (
            <LeaveReviewForm
              key={`${selected.id}:${selected.revision}`}
              item={selected}
              onSaved={() => setSelected(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
