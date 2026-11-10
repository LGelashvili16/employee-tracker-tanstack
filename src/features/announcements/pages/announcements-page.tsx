import { useQuery } from '@tanstack/react-query'
import { IconSpeakerphone } from '@tabler/icons-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardFooter } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '#/components/ui/pagination'
import {
  announcementsQuery,
  announcementDetailQuery,
} from '../announcements.queries'
import { AnnouncementFilters } from '../components/announcement-filters'
import { AnnouncementsTable } from '../components/announcements-table'
import { AnnouncementDialog } from '../components/announcement-dialog'
import { PublishAnnouncementSheet } from '../components/publish-announcement-sheet'
import type { AnnouncementSearch } from '../announcements.schemas'

function AnnouncementReader({
  id,
  actorId,
  onClose,
}: {
  id: string
  actorId: string
  onClose: () => void
}) {
  const query = useQuery(announcementDetailQuery(actorId, id))
  if (query.data)
    return (
      <AnnouncementDialog
        value={query.data}
        actorId={actorId}
        onClose={onClose}
      />
    )
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>განცხადება</DialogTitle>
        </DialogHeader>
        {query.isPending ? (
          <div role="status" aria-label="განცხადება იტვირთება" aria-busy="true">
            <Skeleton className="h-48" aria-hidden="true" />
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertDescription>
              განცხადება ვერ ჩაიტვირთა. გადაამოწმეთ თქვენი წვდომა და სცადეთ
              ხელახლა.
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function AnnouncementsPage({
  actorId,
  search,
  manage = false,
  onSearch,
}: {
  actorId: string
  search: AnnouncementSearch
  manage?: boolean
  onSearch: (next: AnnouncementSearch, replace?: boolean) => void
}) {
  const query = useQuery(announcementsQuery(actorId, search))
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 20))
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {manage ? 'განცხადებების მართვა' : 'განცხადებები'}
        </h1>
        {manage ? (
          <PublishAnnouncementSheet
            actorId={actorId}
            onPublished={() =>
              onSearch({ page: 1, q: '', status: 'all', sort: 'newest' })
            }
          />
        ) : null}
      </header>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AnnouncementFilters search={search} onChange={onSearch} />
        {query.data ? (
          <Badge variant="secondary">სულ {query.data.total}</Badge>
        ) : null}
      </div>
      <Card className="min-w-0 gap-0 rounded-2xl">
        <CardContent className="px-0">
          {query.isPending ? (
            <div
              role="status"
              aria-label="განცხადებები იტვირთება"
              aria-busy="true"
            >
              <div aria-hidden="true" className="flex flex-col gap-4 p-5">
                {[1, 2, 3, 4].map((key) => (
                  <Skeleton key={key} className="h-14" />
                ))}
              </div>
            </div>
          ) : query.isError ? (
            <Alert variant="destructive" className="m-5 w-auto">
              <AlertDescription>
                განცხადებები ვერ ჩაიტვირთა. განაახლეთ გვერდი და სცადეთ ხელახლა.
              </AlertDescription>
            </Alert>
          ) : query.data.items.length ? (
            <AnnouncementsTable
              items={query.data.items}
              sort={search.sort}
              onSort={() =>
                onSearch({
                  ...search,
                  sort: search.sort === 'newest' ? 'oldest' : 'newest',
                  page: 1,
                })
              }
              onOpen={(id) => onSearch({ ...search, announcementId: id })}
            />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia aria-hidden="true">
                  <IconSpeakerphone />
                </EmptyMedia>
                <EmptyTitle>
                  {search.q || search.status !== 'all'
                    ? 'შედეგი ვერ მოიძებნა.'
                    : search.page > 1
                      ? 'ამ გვერდზე განცხადებები არ არის.'
                      : 'განცხადებები ჯერ არ გამოქვეყნებულა.'}
                </EmptyTitle>
              </EmptyHeader>
              {search.page > 1 ? (
                <EmptyContent>
                  <Button
                    variant="outline"
                    depth="raised"
                    onClick={() => onSearch({ ...search, page: 1 })}
                  >
                    პირველ გვერდზე დაბრუნება
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span className="text-sm text-muted-foreground">
            გვერდი {search.page} / {pages}
          </span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  render={
                    <Button
                      nativeButton
                      disabled={search.page <= 1 || query.isFetching}
                      onClick={() =>
                        onSearch({
                          ...search,
                          page: search.page - 1,
                          announcementId: undefined,
                        })
                      }
                    />
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  render={
                    <Button
                      nativeButton
                      disabled={search.page >= pages || query.isFetching}
                      onClick={() =>
                        onSearch({
                          ...search,
                          page: search.page + 1,
                          announcementId: undefined,
                        })
                      }
                    />
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      </Card>
      {search.announcementId ? (
        <AnnouncementReader
          key={search.announcementId}
          id={search.announcementId}
          actorId={actorId}
          onClose={() =>
            onSearch({ ...search, announcementId: undefined }, true)
          }
        />
      ) : null}
    </div>
  )
}
