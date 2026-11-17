import { useMemo } from 'react'
import { IconArrowLeft } from '@tabler/icons-react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { EmployeeTimesheetsWorkspace } from '#/features/timesheets/components/employee-timesheets-workspace'
import { employeeTimesheetSearch } from '#/features/timesheets/timesheets.schemas'
import { CompanyAttendanceSessionsTable } from '../components/company-attendance-sessions-table'
import { AttendanceDayPicker } from '../components/attendance-day-picker'
import { companyAttendanceUserQuery } from '../company-attendance.queries'
import { EmployeeAttendanceSummary } from '../components/employee-attendance-summary'
import { Avatar, AvatarImage, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { AssistedClockSheet } from '#/features/attendance-security/components/assisted-clock-sheet'
import { hasPermission } from '#/lib/authorization/permissions'

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
  const period =
    search.period ?? (search.view === 'timesheet' ? 'month' : 'week')
  const selectedDate =
    !search.period && search.view === 'timesheet' && search.month
      ? `${search.month}-01`
      : search.date
  const query = useQuery({
    ...companyAttendanceUserQuery(actor.id, {
      date: selectedDate,
      userId,
      period,
    }),
    placeholderData: keepPreviousData,
  })
  const result = query.data
  const rows = useMemo(
    () =>
      result?.sessions.map((session) => ({
        ...session,
        serverNow: result.serverNow,
      })) ?? [],
    [result],
  )
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-14 rounded-xl">
            <AvatarImage src={result?.subject.image ?? undefined} alt="" />
            <AvatarFallback className="rounded-xl text-lg">
              {(result?.subject.name ?? '')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {result?.subject.name ?? 'თანამშრომლის ჩანაწერები'}
            </h1>
            {result ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>
                  {result.subject.jobTitle || 'თანამდებობა არ არის მითითებული'}
                </span>
                {result.subject.code ? (
                  <span className="font-mono">@{result.subject.code}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link to="/manage/attendance" />}
        >
          <IconArrowLeft aria-hidden="true" />
          ყველა თანამშრომელი
        </Button>
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
          {result.canReadAttendance === false ? (
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
          ) : (
            <div className="flex min-w-0 flex-col gap-6">
              <div
                role="group"
                aria-label="დასწრების პერიოდი"
                className="flex w-fit gap-1 rounded-xl border bg-muted/40 p-1"
              >
                {(['week', 'month'] as const).map((value) => (
                  <Button
                    key={value}
                    variant={period === value ? 'secondary' : 'ghost'}
                    size="sm"
                    nativeButton={false}
                    role="link"
                    render={
                      <Link
                        to="/manage/attendance/$userId"
                        params={{ userId }}
                        search={{
                          ...search,
                          period: value,
                          date: selectedDate ?? result.date,
                          view: undefined,
                        }}
                      />
                    }
                    aria-current={period === value ? 'true' : undefined}
                  >
                    {value === 'week' ? 'კვირა' : 'თვე'}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <AttendanceDayPicker
                  weekly={period === 'week'}
                  monthly={period === 'month'}
                  date={selectedDate ?? result.date}
                  today={result.today}
                  onChange={(date) => {
                    void navigate({
                      search: { ...search, period, view: undefined, date },
                    })
                  }}
                />
                {hasPermission(actor, 'attendance.record.manage') &&
                (actor.id !== userId ||
                  hasPermission(actor, 'attendance.correct.self')) ? (
                  <AssistedClockSheet
                    userId={userId}
                    employeeName={result.subject.name}
                    timezone={result.companyTimezone}
                    serverNow={result.serverNow}
                  />
                ) : null}
              </div>
              {query.isPlaceholderData ? (
                <Skeleton
                  aria-hidden="true"
                  className="h-72 w-full rounded-xl"
                />
              ) : (
                <EmployeeAttendanceSummary
                  result={result}
                  monthly={period === 'month'}
                />
              )}
              <div
                className="min-w-0 overflow-hidden rounded-xl border bg-card"
                aria-busy={query.isFetching}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                  <h2 className="font-medium">დასწრების ისტორია</h2>
                  <span className="text-sm text-muted-foreground">
                    {query.isPlaceholderData
                      ? 'იტვირთება'
                      : `${rows.length} ჩანაწერი`}
                  </span>
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
                    არჩეულ პერიოდში დასწრების ჩანაწერები არ არის.
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
            </div>
          )}
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
