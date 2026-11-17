import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { IconPlus } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { DataPagination } from '#/components/common/data-pagination'
import { complaintKeys, complaintListOptions } from '../complaints.queries'
import type { ComplaintSearch } from '../complaints.schemas'
import { ComplaintSearch as Search } from './complaint-search'
import { ComplaintTable } from './complaint-table'
import { ComplaintCreateForm } from './complaint-create-form'
import { ComplaintDetailView, ComplaintsLoading } from './complaint-detail-view'

export function ComplaintListView({
  actorId,
  search,
  review = false,
  onChange,
}: {
  actorId: string
  search: ComplaintSearch
  review?: boolean
  onChange: (search: ComplaintSearch, replace: boolean) => void
}) {
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const client = useQueryClient()
  const query = useQuery(complaintListOptions(actorId, search, review))
  async function retry() {
    const result = await query.refetch()
    if (result.isError) toast.error('საჩივრები ვერ ჩაიტვირთა. სცადეთ ხელახლა.')
    else toast.success('სია განახლებულია.')
  }
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {review ? 'საჩივრების მართვა' : 'საჩივრები'}
        </h1>
        {!review ? (
          <Button onClick={() => setCreating(true)}>
            <IconPlus data-icon="inline-start" aria-hidden="true" />
            ახალი საჩივარი
          </Button>
        ) : null}
      </div>
      <Search search={search} onChange={onChange} />
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        {query.isPending ? (
          <ComplaintsLoading />
        ) : query.isError ? (
          <div className="flex flex-col gap-4 p-4">
            <Alert variant="destructive">
              <AlertDescription>
                საჩივრები ვერ ჩაიტვირთა. გადაამოწმეთ წვდომა და სცადეთ ხელახლა.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              disabled={query.isFetching}
              aria-busy={query.isFetching}
              onClick={() => void retry()}
            >
              {query.isFetching ? <Spinner aria-hidden="true" /> : null}ხელახლა
              ცდა
            </Button>
          </div>
        ) : (
          <>
            {query.data.items.length ? (
              <ComplaintTable
                items={query.data.items}
                review={review}
                search={search}
              />
            ) : (
              <div
                role="status"
                className="flex flex-col items-center gap-4 p-8 text-center"
              >
                <p className="text-sm text-muted-foreground">
                  {search.q || (search.status && search.status !== 'all')
                    ? 'შესაბამისი საჩივრები ვერ მოიძებნა.'
                    : 'საჩივრები ჯერ არ არის.'}
                </p>
                {(search.page ?? 1) > 1 ? (
                  <Button
                    variant="outline"
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
                renderLink={(page) => (
                  <Link
                    to={review ? '/manage/complaints' : '/complaints'}
                    search={{ ...search, page }}
                  />
                )}
              />
            </div>
          </>
        )}
      </div>
      <Sheet
        open={creating}
        onOpenChange={(open) => {
          if (!saving) setCreating(open)
        }}
      >
        <SheetContent
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
          aria-describedby={undefined}
        >
          <SheetHeader className="shrink-0 border-b px-6 py-5">
            <SheetTitle>ახალი საჩივარი</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto px-6 pb-6">
            {creating ? (
              <ComplaintCreateForm
                onPendingChange={setSaving}
                onSaved={(id) => {
                  setCreating(false)
                  void client.invalidateQueries({
                    queryKey: complaintKeys.all(actorId),
                  })
                  onChange(
                    { ...search, complaintId: id, activityPage: 1 },
                    false,
                  )
                }}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
      <Sheet
        open={!!search.complaintId}
        onOpenChange={(open) => {
          if (!open)
            onChange(
              { ...search, complaintId: undefined, activityPage: undefined },
              false,
            )
        }}
      >
        <SheetContent
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
          aria-describedby={undefined}
        >
          <SheetHeader className="shrink-0 border-b px-6 py-5">
            <SheetTitle>
              {review ? 'საჩივრის განხილვა' : 'საჩივრის დეტალები'}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto px-6 pb-6">
            {search.complaintId ? (
              <ComplaintDetailView
                actorId={actorId}
                id={search.complaintId}
                search={search}
                review={review}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}
