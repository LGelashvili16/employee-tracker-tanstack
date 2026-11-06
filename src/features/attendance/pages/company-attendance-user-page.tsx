import { useMemo } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
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
import { CompanyAttendanceSessionsTable } from '../components/company-attendance-sessions-table'
import { CompanyAttendancePagination } from '../components/company-attendance-pagination'
import { companyAttendanceUserQuery } from '../company-attendance.queries'
import { formatWorkedTime, sessionMetrics } from '../attendance.rules'

const route = getRouteApi('/_authenticated/admin/attendance/$userId')
export function CompanyAttendanceUserPage() {
  const { actor } = route.useRouteContext()
  const { userId } = route.useParams()
  const search = route.useSearch()
  const sort = search.sort ?? 'date-desc'
  const query = useQuery(
    companyAttendanceUserQuery(actor.id, { ...search, userId }),
  )
  const result = query.data
  const groups = useMemo(
    () =>
      result?.days.map((date) => {
        const rows = result.sessions
          .filter((session) => session.date === date)
          .map((session) => ({ ...session, serverNow: result.serverNow }))
        const seconds = rows.reduce(
          (sum, row) =>
            sum +
            sessionMetrics(
              row.startedAt,
              row.endedAt,
              row.expectedStartAt,
              row.expectedEndAt,
              row.serverNow,
            ).seconds,
          0,
        )
        return { date, rows, seconds }
      }) ?? [],
    [result],
  )
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <Link
        className="w-fit text-sm underline underline-offset-4"
        to="/admin/attendance"
      >
        ყველა თანამშრომელი
      </Link>
      {query.isPending ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">დასწრების ისტორია იტვირთება</span>
          <Skeleton
            aria-hidden="true"
            className="h-72 w-full motion-reduce:animate-none"
          />
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
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold">{result.subject.name}</h1>
              <p className="text-sm text-muted-foreground">
                {result.subject.code || 'დასწრების ისტორია'}. სესიები
                დაჯგუფებულია სამუშაო დღით. ღამის საათები რჩება შესვლის სამუშაო
                დღეზე.
              </p>
            </div>
            <Link
              className="text-sm underline underline-offset-4"
              to="/admin/timesheets"
              search={{ userId }}
            >
              სამუშაო საათები
            </Link>
          </header>
          <nav aria-label="დასწრების დალაგება" className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              role="link"
              variant={sort === 'date-desc' ? 'secondary' : 'ghost'}
              render={
                <Link
                  to="/admin/attendance/$userId"
                  params={{ userId }}
                  search={{ sort: 'date-desc', page: 1 }}
                  aria-current={sort === 'date-desc' ? 'true' : undefined}
                />
              }
            >
              ჯერ ახალი
            </Button>
            <Button
              nativeButton={false}
              role="link"
              variant={sort === 'date-asc' ? 'secondary' : 'ghost'}
              render={
                <Link
                  to="/admin/attendance/$userId"
                  params={{ userId }}
                  search={{ sort: 'date-asc', page: 1 }}
                  aria-current={sort === 'date-asc' ? 'true' : undefined}
                />
              }
            >
              ჯერ ძველი
            </Button>
          </nav>
          {groups.length ? (
            groups.map((group) => (
              <Card key={group.date}>
                <CardHeader>
                  <CardTitle>სამუშაო დღე: {group.date}</CardTitle>
                  <CardDescription>
                    სესიები: {group.rows.length}. აღრიცხული დრო:{' '}
                    {formatWorkedTime(group.seconds)}
                    {group.rows.some((row) => row.endedAt === null)
                      ? '. მიმდინარე სესიის დრო წინასწარია.'
                      : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CompanyAttendanceSessionsTable rows={group.rows} />
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="rounded-xl border p-6 text-sm text-muted-foreground">
              დასწრების სესიები ჯერ არ არის.
            </p>
          )}
          <CompanyAttendancePagination
            page={search.page ?? 1}
            total={result.totalDays}
            pageSize={result.pageSize}
            renderLink={(page) => (
              <Link
                to="/admin/attendance/$userId"
                params={{ userId }}
                search={{ ...search, page }}
              />
            )}
          />
        </>
      )}
    </section>
  )
}
