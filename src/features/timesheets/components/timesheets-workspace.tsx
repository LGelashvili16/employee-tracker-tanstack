import { useState } from 'react'
import type { ReactElement } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { IconInfoCircle, IconRefresh } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { getOwnTimesheets } from '../timesheets.functions'
import { CompanyTimesheetFilters } from './company-timesheet-filters'
import {
  CompanyTimesheetPeriod,
  CompanyTimesheetSummary,
} from './company-timesheet-period'
import { CompanyTimesheetResults } from './company-timesheet-results'
import type { TimesheetSearch } from '../timesheets.types'
import type { Actor } from '#/lib/authorization/actor'

type Props = {
  actor: Actor
  search: TimesheetSearch
  onSearchChange: (value: TimesheetSearch, replace?: boolean) => void
  renderLink: (search: TimesheetSearch) => ReactElement
}
export function TimesheetsWorkspace(props: Props) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <TimesheetsOverview {...props} />
    </QueryClientProvider>
  )
}

function TimesheetsOverview({
  actor,
  search,
  onSearchChange,
  renderLink,
}: Props) {
  const query = useQuery({
    queryKey: ['timesheets', actor.id, search],
    queryFn: async () => {
      const response = await getOwnTimesheets({
        data: { ...search, page: search.page ?? 0 },
      })
      if (!response.ok) throw new Error('სამუშაო საათები ვერ ჩაიტვირთა.')
      return response.value
    },
    retry: false,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
  const result = query.data
  const month = result?.month ?? search.month
  async function refresh() {
    const response = await query.refetch()
    if (response.isError)
      toast.error('სამუშაო საათები ვერ განახლდა. სცადეთ ხელახლა.')
    else toast.success('სამუშაო საათები განახლდა.')
  }
  return (
    <section className="flex min-w-0 flex-col gap-6">
      {result && !query.isError ? (
        <CompanyTimesheetSummary totals={result.totals} />
      ) : query.isPending ? (
        <div
          aria-hidden="true"
          className="grid grid-cols-2 gap-4 xl:grid-cols-4"
        >
          {[0, 1, 2, 3].map((cell) => (
            <Skeleton
              key={cell}
              className="h-24 rounded-xl motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : null}
      {result && !query.isError && result.totals.open > 0 ? (
        <Alert variant="info">
          <IconInfoCircle aria-hidden="true" />
          <AlertDescription>
            პერიოდში არის {result.totals.open} მიმდინარე ჩანაწერი. საბოლოო დრო
            გასვლის შემდეგ დაზუსტდება.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card className="min-w-0 gap-0 overflow-hidden py-0">
        <CardHeader className="gap-4 border-b p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>
              <h2>დღიური აღრიცხვა</h2>
            </CardTitle>
            <Button
              variant="outline"
              depth="raised"
              disabled={query.isFetching}
              aria-busy={query.isFetching}
              onClick={() => void refresh()}
            >
              <span className="flex size-4 items-center justify-center">
                {query.isFetching ? (
                  <Spinner aria-hidden="true" />
                ) : (
                  <IconRefresh aria-hidden="true" />
                )}
              </span>
              განახლება
            </Button>
          </div>
          <CompanyTimesheetFilters
            hideSearch
            search={search}
            onChange={onSearchChange}
            period={
              <CompanyTimesheetPeriod
                month={month}
                search={search}
                onChange={onSearchChange}
              />
            }
          />
        </CardHeader>
        <CardContent className="p-0">
          <CompanyTimesheetResults
            query={query}
            search={search}
            onRetry={() => void refresh()}
            renderLink={renderLink}
          />
        </CardContent>
      </Card>
    </section>
  )
}
