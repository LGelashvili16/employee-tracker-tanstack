import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { formatWorkedTime } from '#/features/attendance/attendance.rules'
import {
  getCompanyTimesheets,
  getOwnTimesheets,
  getTeamTimesheets,
} from '../timesheets.functions'
import { shiftTimesheetMonth } from '../timesheets.rules'
import { TimesheetDaysTable } from './timesheet-days-table'
import type { TimesheetSearch } from '../timesheets.types'
import type { Actor } from '#/lib/authorization/actor'
import { hasPermission } from '#/lib/authorization/permissions'

type Props = {
  actor: Actor
  team?: boolean
  company?: boolean
  search: TimesheetSearch
  onSearchChange: (value: TimesheetSearch) => void
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
  team = false,
  company = false,
  search,
  onSearchChange,
}: Props) {
  const page = search.page ?? 0
  const query = useQuery({
    queryKey: [
      'timesheets',
      actor.id,
      team,
      company,
      search.month,
      search.userId,
      page,
    ],
    queryFn: () =>
      (company
        ? getCompanyTimesheets
        : team
          ? getTeamTimesheets
          : getOwnTimesheets)({
        data: { month: search.month, page, userId: search.userId },
      }),
    retry: false,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
  const result = query.data?.ok ? query.data.value : null
  const month = result?.month ?? search.month
  const rows = useMemo(
    () =>
      result?.rows.map((row) => ({
        ...row,
        team,
        company,
        month: result.month,
      })) ?? [],
    [result, team, company],
  )
  const changeMonth = (change: number) => {
    if (!month) return
    onSearchChange({
      ...search,
      month: shiftTimesheetMonth(month, change),
      page: 0,
    })
  }
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">
            {company
              ? 'ყველა თანამშრომლის სამუშაო საათები'
              : team
                ? 'გუნდის სამუშაო საათები'
                : 'ჩემი სამუშაო საათები'}
          </h1>
          <p className="text-sm text-muted-foreground">
            საათები ეფუძნება დასწრების ჩანაწერებს. მიმდინარე ჩანაწერების დრო
            წინასწარია.
          </p>
          {search.userId ? (
            <p className="text-sm">
              თანამშრომელი:{' '}
              {result?.rows[0]?.employeeName ?? 'არჩეული ანგარიში'}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            aria-label="წინა თვე"
            disabled={!month || month <= '2000-01' || query.isFetching}
            onClick={() => changeMonth(-1)}
          >
            წინა თვე
          </Button>
          <span className="min-w-20 text-center font-medium" aria-live="polite">
            {!team && !company && month ? (
              <Link
                className="underline underline-offset-4"
                to="/timesheets/$timesheetId"
                params={{ timesheetId: month }}
              >
                {month}
              </Link>
            ) : (
              (month ?? 'თვე')
            )}
          </span>
          <Button
            variant="outline"
            aria-label="შემდეგი თვე"
            disabled={!month || month >= '2100-12' || query.isFetching}
            onClick={() => changeMonth(1)}
          >
            შემდეგი თვე
          </Button>
        </div>
      </div>
      {(team || company) &&
      search.userId &&
      hasPermission(
        actor.roles,
        company ? 'attendance.read.all' : 'attendance.read.team',
      ) ? (
        <Link
          className="w-fit text-sm underline underline-offset-4"
          to={company ? '/admin/attendance' : '/manage/attendance'}
          search={{ userId: search.userId }}
        >
          თანამშრომლის დასწრების ჩანაწერები
        </Link>
      ) : null}
      {(team || company) && search.userId ? (
        <Link
          className="w-fit text-sm underline underline-offset-4"
          to={company ? '/admin/timesheets' : '/manage/timesheets'}
          search={{ month }}
        >
          ყველა ხელმისაწვდომი თანამშრომელი
        </Link>
      ) : null}
      {query.isPending ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">სამუშაო საათები იტვირთება</span>
          <Skeleton
            aria-hidden="true"
            className="h-72 w-full motion-reduce:animate-none"
          />
        </div>
      ) : query.isError || !result ? (
        <Alert variant="destructive">
          <AlertDescription>
            სამუშაო საათები ვერ ჩაიტვირთა. გადაამოწმეთ წვდომა და სცადეთ ხელახლა.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['აღრიცხული დრო', formatWorkedTime(result.totals.seconds)],
              ['დღის ჩანაწერები', String(result.totals.days)],
              [
                'დამტკიცებული დამატებითი დრო',
                formatWorkedTime(result.totals.approvedOutsideSeconds),
              ],
              ['განხილვის მოლოდინში', String(result.totals.pending)],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardHeader>
                  <CardDescription>{label}</CardDescription>
                  <CardTitle>{value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
          {result.totals.open > 0 ? (
            <Alert>
              <AlertDescription>
                პერიოდში არის {result.totals.open} მიმდინარე ჩანაწერი. საბოლოო
                დრო გასვლის შემდეგ დაზუსტდება.
              </AlertDescription>
            </Alert>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>დღიური აღრიცხვა</CardTitle>
              <CardDescription>
                დღე ეკუთვნის შესვლის თარიღს. დრო ნაჩვენებია ჩანაწერის დროის
                სარტყელში.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rows.length ? (
                <TimesheetDaysTable rows={rows} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  ამ პერიოდში ხელმისაწვდომი ჩანაწერები არ მოიძებნა.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={query.isFetching}
          aria-busy={query.isFetching}
          onClick={async () => {
            const refreshed = await query.refetch()
            if (refreshed.data?.ok && !refreshed.isError)
              toast.success('სამუშაო საათები განახლდა.')
            else toast.error('სამუშაო საათები ვერ განახლდა. სცადეთ ხელახლა.')
          }}
        >
          {query.isFetching ? <Spinner aria-hidden="true" /> : null}განახლება
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={page === 0 || query.isFetching}
            onClick={() => onSearchChange({ ...search, month, page: page - 1 })}
          >
            წინა
          </Button>
          <span className="text-sm" aria-live="polite">
            გვერდი {page + 1}
          </span>
          <Button
            variant="outline"
            disabled={!result?.hasMore || query.isFetching || page >= 10000}
            onClick={() => onSearchChange({ ...search, month, page: page + 1 })}
          >
            შემდეგი
          </Button>
        </div>
      </div>
    </section>
  )
}
