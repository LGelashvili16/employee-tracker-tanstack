import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { IconInfoCircle } from '@tabler/icons-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '#/components/ui/alert'

import { Skeleton } from '#/components/ui/skeleton'

import { companyTimesheetsQuery } from '../timesheets.queries'
import { CompanyTimesheetFilters } from './company-timesheet-filters'
import {
  CompanyTimesheetPeriod,
  CompanyTimesheetSummary,
} from './company-timesheet-period'
import { CompanyTimesheetResults } from './company-timesheet-results'
import type { TimesheetSearch } from '../timesheets.types'

export function CompanyTimesheetsWorkspace({
  actorId,
  search,
  onChange,
}: {
  actorId: string
  search: TimesheetSearch
  onChange: (search: TimesheetSearch, replace?: boolean) => void
}) {
  const query = useQuery(companyTimesheetsQuery(actorId, search))
  const result = query.data
  const month = result?.month ?? search.month
  const reset = {
    ...search,
    month,
    page: 0,
    q: undefined,
    status: undefined,
    userId: undefined,
  }
  async function retry() {
    const response = await query.refetch()
    if (response.isError)
      toast.error('სამუშაო საათები ვერ ჩაიტვირთა. სცადეთ ხელახლა.')
    else toast.success('სამუშაო საათები ჩაიტვირთა.')
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
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
            პერიოდში არის {result.totals.open} მიმდინარე ჩანაწერი. აღრიცხული დრო
            გასვლის შემდეგ დაზუსტდება.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4">
          <CompanyTimesheetFilters
            search={search}
            onChange={onChange}
            period={
              <CompanyTimesheetPeriod
                month={month}
                search={search}
                onChange={onChange}
              />
            }
          />
          {search.userId ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                {result?.rows[0]?.employeeName ?? 'არჩეული თანამშრომელი'}
              </span>
              <Link
                className="underline underline-offset-4"
                to="/admin/attendance/$userId"
                params={{ userId: search.userId }}
              >
                დასწრების ისტორია
              </Link>
              <Link
                className="underline underline-offset-4"
                to="/admin/timesheets"
                search={reset}
              >
                ყველა თანამშრომელი
              </Link>
            </div>
          ) : null}
        </div>
        <CompanyTimesheetResults
          query={query}
          search={search}
          onRetry={() => void retry()}
        />
      </div>
    </div>
  )
}
