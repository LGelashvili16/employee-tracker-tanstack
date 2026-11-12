import { useMemo } from 'react'
import { IconCalendarCheck, IconClock } from '@tabler/icons-react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { EmployeeTimesheetsWorkspace } from '#/features/timesheets/components/employee-timesheets-workspace'
import { employeeTimesheetSearch } from '#/features/timesheets/timesheets.schemas'
import { CompanyAttendanceSessionsTable } from '../components/company-attendance-sessions-table'
import { AttendanceDayPicker } from '../components/attendance-day-picker'
import { companyAttendanceUserQuery } from '../company-attendance.queries'
import { formatWorkedTime, sessionMetrics } from '../attendance.rules'

const route = getRouteApi('/_authenticated/manage/attendance/$userId')
export function CompanyAttendanceUserPage() {
  const { userId } = route.useParams()
  return <EmployeeAttendanceWorkspace key={userId} />
}

function EmployeeAttendanceWorkspace() {
  const { actor } = route.useRouteContext()
  const { userId } = route.useParams()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const query = useQuery({
    ...companyAttendanceUserQuery(actor.id, {
      date: search.date,
      userId,
      period: 'week',
    }),
    placeholderData: keepPreviousData,
  })
  const result = query.data
  const tabs = [
    ...(result?.canReadAttendance !== false
      ? [{ value: 'attendance', label: 'დასწრებები' } as const]
      : []),
    ...(result?.canReadTimesheets !== false
      ? [{ value: 'timesheet', label: 'სამუშაო საათები' } as const]
      : []),
  ]
  const view =
    tabs.find((tab) => tab.value === search.view)?.value ??
    (result?.canReadAttendance === false ? 'timesheet' : 'attendance')
  const rows = useMemo(
    () =>
      result?.sessions.map((session) => ({
        ...session,
        serverNow: result.serverNow,
      })) ?? [],
    [result],
  )
  const seconds = rows.reduce(
    (total, row) =>
      total +
      sessionMetrics(
        row.startedAt,
        row.endedAt,
        row.expectedStartAt,
        row.expectedEndAt,
        row.serverNow,
      ).seconds,
    0,
  )
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {result?.subject.name ?? 'თანამშრომლის ჩანაწერები'}
        </h1>
        <Link
          className="text-sm underline underline-offset-4"
          to="/manage/attendance"
        >
          ყველა თანამშრომელი
        </Link>
      </header>
      {query.isPending ? (
        <div className="flex flex-col gap-6">
          <Skeleton
            aria-hidden="true"
            className="h-10 w-64 motion-reduce:animate-none"
          />
          <AttendanceSessionsSkeleton />
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            დასწრების ისტორია ვერ ჩაიტვირთა. სცადეთ ხელახლა.
          </AlertDescription>
        </Alert>
      ) : !result ? (
        <Alert>
          <AlertDescription>
            თანამშრომლის ანგარიში ვერ მოიძებნა.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Tabs value={view} className="min-w-0 gap-6">
            <nav
              aria-label="თანამშრომლის სამუშაო ჩანაწერები"
              className="-m-1 overflow-x-auto p-1"
            >
              <TabsList
                aria-label="თანამშრომლის სამუშაო ჩანაწერები"
                className="w-max gap-1 rounded-xl border p-0.5 group-data-horizontal/tabs:h-auto"
              >
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    nativeButton={false}
                    className="h-9 flex-none px-4 motion-reduce:transition-none"
                    render={
                      <Link
                        to="/manage/attendance/$userId"
                        params={{ userId }}
                        search={{ ...search, view: tab.value }}
                      />
                    }
                  >
                    {tab.value === 'attendance' ? (
                      <IconCalendarCheck aria-hidden="true" />
                    ) : (
                      <IconClock aria-hidden="true" />
                    )}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </nav>
            <TabsContent
              value="attendance"
              className="flex min-w-0 flex-col gap-6"
            >
              <div
                className="min-w-0 overflow-hidden rounded-xl border bg-card"
                aria-busy={query.isFetching}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
                  <AttendanceDayPicker
                    weekly
                    date={search.date ?? result.date}
                    today={result.today}
                    onChange={(date) => {
                      void navigate({ search: { ...search, date } })
                    }}
                  />
                  {query.isPlaceholderData ? (
                    <Skeleton
                      aria-hidden="true"
                      className="h-5 w-48 motion-reduce:animate-none"
                    />
                  ) : (
                    <dl className="flex flex-wrap items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <dt className="text-muted-foreground">სესიები</dt>
                        <dd className="font-medium tabular-nums">
                          {rows.length}
                        </dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <dt className="text-muted-foreground">აღრიცხული დრო</dt>
                        <dd className="font-medium tabular-nums">
                          {formatWorkedTime(seconds)}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
                {query.isPlaceholderData ? (
                  <AttendanceSessionsSkeleton />
                ) : rows.length ? (
                  <CompanyAttendanceSessionsTable rows={rows} />
                ) : (
                  <p
                    role="status"
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    არჩეულ კვირაში დასწრების ჩანაწერები არ არის.
                  </p>
                )}
                {!query.isPlaceholderData && query.isFetching ? (
                  <span className="sr-only" role="status">
                    დასწრების ჩანაწერები ახლდება
                  </span>
                ) : null}
                <div className="flex flex-wrap justify-between gap-2 border-t px-4 py-3 text-xs leading-5 text-muted-foreground">
                  <span>
                    ღამის სესია ნაჩვენებია შესვლის სამუშაო დღეზე.
                    {!query.isPlaceholderData &&
                    rows.some((row) => row.endedAt === null)
                      ? ' მიმდინარე სესიის დრო წინასწარია.'
                      : ''}
                  </span>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="timesheet" className="min-w-0">
              {view === 'timesheet' ? (
                <EmployeeTimesheetsWorkspace
                  actorId={actor.id}
                  userId={userId}
                  search={{
                    userId,
                    month: search.month,
                    page: search.hoursPage,
                    sort: search.hoursSort,
                    status: search.hoursStatus,
                  }}
                  onChange={(value, replace) => {
                    void navigate({
                      search: { ...search, ...employeeTimesheetSearch(value) },
                      replace,
                    })
                  }}
                  renderLink={(value) => (
                    <Link
                      to="/manage/attendance/$userId"
                      params={{ userId }}
                      search={{ ...search, ...employeeTimesheetSearch(value) }}
                    />
                  )}
                />
              ) : null}
            </TabsContent>
          </Tabs>
        </>
      )}
    </section>
  )
}

function AttendanceSessionsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 p-4">
      <span className="sr-only">დასწრების ჩანაწერები იტვირთება</span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full motion-reduce:animate-none" />
        {[1, 2, 3].map((row) => (
          <div key={row} className="grid grid-cols-3 gap-4 border-b pb-4">
            <Skeleton className="h-4 motion-reduce:animate-none" />
            <Skeleton className="h-4 motion-reduce:animate-none" />
            <Skeleton className="h-5 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  )
}
