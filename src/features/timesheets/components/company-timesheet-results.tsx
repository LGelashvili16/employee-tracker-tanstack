import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { IconClock, IconRefresh } from '@tabler/icons-react'
import { DataPagination } from '#/components/common/data-pagination'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { TimesheetDaysTable } from './timesheet-days-table'
import type { UseQueryResult } from '@tanstack/react-query'
import type { TimesheetResult, TimesheetSearch } from '../timesheets.types'

export function CompanyTimesheetResults({
  query,
  search,
  onRetry,
}: {
  query: UseQueryResult<TimesheetResult, Error>
  search: TimesheetSearch
  onRetry: () => void
}) {
  const result = query.data
  const month = result?.month ?? search.month
  const filtered = Boolean(
    search.q || search.userId || (search.status && search.status !== 'all'),
  )
  const reset = {
    ...search,
    month,
    page: 0,
    q: undefined,
    status: undefined,
    userId: undefined,
  }
  const rows = useMemo(
    () =>
      result?.rows.map((row) => ({
        ...row,
        team: false,
        company: true,
        month: result.month,
      })) ?? [],
    [result],
  )
  return (
    <div aria-busy={query.isFetching}>
      {query.isFetching && !query.isPending ? (
        <span role="status" className="sr-only">
          სამუშაო საათები ახლდება
        </span>
      ) : null}
      {query.isPending ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-4 p-4">
          <span className="sr-only">სამუშაო საათები იტვირთება</span>
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
            <AlertTitle>სამუშაო საათები ვერ ჩაიტვირთა.</AlertTitle>
            <AlertDescription>
              გადაამოწმეთ წვდომა და სცადეთ ხელახლა.
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                depth="raised"
                disabled={query.isFetching}
                aria-busy={query.isFetching}
                onClick={onRetry}
              >
                {query.isFetching ? (
                  <Spinner aria-hidden="true" />
                ) : (
                  <IconRefresh aria-hidden="true" />
                )}
                ხელახლა ცდა
              </Button>
            </AlertAction>
          </Alert>
        </div>
      ) : result ? (
        <>
          {rows.length ? (
            <TimesheetDaysTable rows={rows} search={{ ...search, month }} />
          ) : (
            <div
              role="status"
              className="flex flex-col items-center gap-3 px-6 py-12 text-center"
            >
              <span
                className="flex size-12 items-center justify-center rounded-xl bg-muted"
                aria-hidden="true"
              >
                <IconClock className="size-5 text-muted-foreground" />
              </span>
              <h2 className="text-base font-medium">
                {(search.page ?? 0) > 0 && result.total > 0
                  ? 'ამ გვერდზე ჩანაწერები არ არის'
                  : filtered
                    ? 'შესაბამისი ჩანაწერები ვერ მოიძებნა'
                    : 'ამ თვეში ჩანაწერები არ არის'}
              </h2>
              {filtered || (search.page ?? 0) > 0 ? (
                <Button
                  variant="outline"
                  depth="raised"
                  nativeButton={false}
                  role="link"
                  render={<Link to="/admin/timesheets" search={reset} />}
                >
                  {filtered
                    ? 'ფილტრების გასუფთავება'
                    : 'პირველ გვერდზე დაბრუნება'}
                </Button>
              ) : null}
            </div>
          )}
          <div className="border-t bg-muted/15 px-4 py-3">
            {/* Existing timesheet URLs use a zero-based page; the shared pagination displays one-based pages. */}
            <DataPagination
              page={(search.page ?? 0) + 1}
              total={result.total}
              pageSize={result.pageSize}
              renderLink={(page) => (
                <Link
                  to="/admin/timesheets"
                  search={{ ...search, month, page: page - 1 }}
                />
              )}
            />
          </div>
          <p className="border-t px-4 py-3 text-xs leading-5 text-muted-foreground">
            დღე ეკუთვნის შესვლის თარიღს. დრო ნაჩვენებია ჩანაწერის დროის
            სარტყელში.
          </p>
        </>
      ) : null}
    </div>
  )
}
