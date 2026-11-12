import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '#/components/ui/pagination'
import { readMyAttendanceCorrections } from '../attendance.functions'
import type { AttendanceCorrection } from '../attendance.types'

function exactTime(value: string | null, timezone: string) {
  if (!value) return 'არ იყო აღრიცხული'
  return new Intl.DateTimeFormat('ka-GE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
}

function Correction({ item }: { item: AttendanceCorrection }) {
  return (
    <li className="flex flex-col gap-3 border-b pb-4 last:border-0 last:pb-0">
      <p className="text-sm font-medium">
        {item.workDate} · {item.actorName}
      </p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {(['startedAt', 'endedAt'] as const).map((field) => (
          <div key={field} className="flex flex-col gap-1">
            <dt className="font-medium">
              {field === 'startedAt' ? 'შესვლა' : 'გასვლა'}
            </dt>
            <dd className="tabular-nums">
              <span className="text-muted-foreground">ცვლილებამდე: </span>
              {exactTime(item.before[field], item.timezone)}
            </dd>
            <dd className="tabular-nums">
              <span className="text-muted-foreground">ცვლილების შემდეგ: </span>
              {exactTime(item.after[field], item.timezone)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm">მიზეზი: {item.reason}</p>
      <p className="text-xs text-muted-foreground">
        შეცვლილია: {exactTime(item.createdAt, item.timezone)}
      </p>
    </li>
  )
}

export function AttendanceCorrections({
  actorId,
  page,
  onPageChange,
}: {
  actorId: string
  page: number
  onPageChange: (page: number) => void
}) {
  const query = useQuery({
    queryKey: ['my-attendance-corrections', actorId, page],
    queryFn: () => readMyAttendanceCorrections({ data: { page } }),
    retry: false,
  })
  const result = query.data
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>დროის შესწორებების ისტორია</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isPending ? (
          <div
            role="status"
            aria-busy="true"
            aria-label="შესწორებები იტვირთება"
          >
            <Skeleton className="h-40" aria-hidden="true" />
          </div>
        ) : query.isError || !result?.ok ? (
          <Alert variant="destructive">
            <AlertDescription>
              შესწორებების ისტორია ვერ ჩაიტვირთა.
            </AlertDescription>
          </Alert>
        ) : !result.value.items.length ? (
          <p className="text-sm text-muted-foreground">
            დროის შესწორებები არ არის.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {result.value.items.map((item) => (
              <Correction key={item.id} item={item} />
            ))}
          </ul>
        )}
        {page > 0 || (result?.ok && result.value.hasMore) ? (
          <Pagination aria-label="შესწორებების გვერდები">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  render={
                    <Button
                      variant="outline"
                      disabled={page === 0 || query.isFetching}
                      onClick={() => onPageChange(page - 1)}
                    />
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm">გვერდი {page + 1}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  render={
                    <Button
                      variant="outline"
                      disabled={
                        page >= 10000 ||
                        query.isFetching ||
                        !result?.ok ||
                        !result.value.hasMore
                      }
                      onClick={() => onPageChange(page + 1)}
                    />
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </CardContent>
    </Card>
  )
}
