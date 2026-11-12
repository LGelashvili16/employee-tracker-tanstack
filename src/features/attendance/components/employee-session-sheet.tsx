import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '#/components/ui/pagination'
import { readMyAttendanceSessions } from '../attendance.functions'
import {
  elapsedSeconds,
  formatAttendanceTimestamp,
  formatWorkedTime,
} from '../attendance.rules'
import { formatAttendanceDate } from '../attendance.presentation'

export function EmployeeSessionSheet({
  actorId,
  date,
  page,
  onPageChange,
  onClose,
}: {
  actorId: string
  date?: string
  page: number
  onPageChange: (page: number) => void
  onClose: () => void
}) {
  // Retain the visible page until the native closing transition finishes.
  const [selection, setSelection] = useState({ date, page })
  if (date && (selection.date !== date || selection.page !== page)) {
    setSelection({ date, page })
  }
  const visibleDate = date ?? selection.date
  const visiblePage = date ? page : selection.page
  const query = useQuery({
    queryKey: ['my-attendance-sessions', actorId, visibleDate, visiblePage],
    queryFn: () => {
      if (!visibleDate) throw new Error('აირჩიეთ სამუშაო დღე.')
      return readMyAttendanceSessions({
        data: { date: visibleDate, page: visiblePage },
      })
    },
    enabled: Boolean(date),
    retry: false,
  })
  const result = query.data
  return (
    <Sheet
      open={Boolean(date)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl motion-reduce:transition-none"
      >
        <SheetHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <SheetTitle>
            {visibleDate ? `${formatAttendanceDate(visibleDate)} · ` : ''}
            სესიები
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          {query.isPending ? (
            <div role="status" aria-busy="true" aria-label="სესიები იტვირთება">
              <Skeleton className="h-48" aria-hidden="true" />
            </div>
          ) : query.isError || !result?.ok ? (
            <Alert variant="destructive">
              <AlertDescription>
                სესიები ვერ ჩაიტვირთა. განაახლეთ გვერდი და სცადეთ ხელახლა.
              </AlertDescription>
            </Alert>
          ) : !result.value.items.length ? (
            <p className="text-sm text-muted-foreground">
              ამ დღეს სესიები არ არის.
            </p>
          ) : (
            result.value.items.map((session) => (
              <Card key={session.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tabular-nums">
                      {formatWorkedTime(
                        elapsedSeconds(
                          session.startedAt,
                          session.endedAt ?? result.value.serverNow,
                        ),
                      )}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {session.corrected ? (
                        <Badge variant="secondary">შესწორებულია</Badge>
                      ) : null}
                      {session.reviewState === 'approved' ||
                      session.reviewState === 'rejected' ? (
                        <Badge
                          variant={
                            session.reviewState === 'approved' ? 'green' : 'red'
                          }
                        >
                          {session.reviewState === 'approved'
                            ? 'დადასტურებული'
                            : 'უარყოფილი'}
                        </Badge>
                      ) : null}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    {(['startedAt', 'endedAt'] as const).map((field) => {
                      const current = session[field]
                      const original =
                        field === 'startedAt'
                          ? session.originalStartedAt
                          : session.originalEndedAt
                      return (
                        <div key={field} className="flex flex-col gap-1">
                          <dt className="text-muted-foreground">
                            {field === 'startedAt' ? 'შესვლა' : 'გასვლა'}
                          </dt>
                          <dd className="font-medium tabular-nums">
                            {current ? (
                              <time dateTime={current}>
                                {formatAttendanceTimestamp(
                                  current,
                                  session.timezone,
                                )}
                              </time>
                            ) : (
                              'მიმდინარე'
                            )}
                          </dd>
                          {session.corrected && original !== current ? (
                            <dd className="text-xs text-muted-foreground tabular-nums">
                              თავდაპირველად:{' '}
                              {original
                                ? formatAttendanceTimestamp(
                                    original,
                                    session.timezone,
                                  )
                                : 'არ იყო აღრიცხული'}
                            </dd>
                          ) : null}
                        </div>
                      )
                    })}
                  </dl>
                </CardContent>
              </Card>
            ))
          )}
          {visiblePage > 0 || (result?.ok && result.value.hasMore) ? (
            <Pagination aria-label="სესიების გვერდები">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    render={
                      <Button
                        variant="outline"
                        disabled={visiblePage === 0 || query.isFetching}
                        onClick={() => onPageChange(visiblePage - 1)}
                      />
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 text-sm">გვერდი {visiblePage + 1}</span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    render={
                      <Button
                        variant="outline"
                        disabled={
                          visiblePage >= 10000 ||
                          query.isFetching ||
                          !result?.ok ||
                          !result.value.hasMore
                        }
                        onClick={() => onPageChange(visiblePage + 1)}
                      />
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
