import { getRouteApi, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { IconRefresh, IconSearch, IconUsers } from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  AlertAction,
} from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Skeleton } from '#/components/ui/skeleton'
import { CompanyAttendanceSearch } from '../components/company-attendance-search'
import { CompanyAttendanceUsersTable } from '../components/company-attendance-users-table'
import { CompanyAttendancePagination } from '../components/company-attendance-pagination'
import { companyAttendanceUsersQuery } from '../company-attendance.queries'

const route = getRouteApi('/_authenticated/manage/attendance/')
export function CompanyAttendancePage() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const query = useQuery(companyAttendanceUsersQuery(actor.id, search))
  const filtered = Boolean(search.q || (search.state && search.state !== 'all'))
  const reset = { ...search, page: 1, q: undefined, state: undefined }
  async function refresh() {
    const result = await query.refetch()
    if (result.isError)
      toast.error('თანამშრომლების სია ვერ განახლდა. სცადეთ ხელახლა.')
    else toast.success('თანამშრომლების სია განახლდა.')
  }
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">დასწრებები</h1>
      {query.data?.scope === 'assigned' ? (
        <Alert role="note" variant="info">
          <AlertDescription>
            ნაჩვენებია მხოლოდ თქვენთვის მინიჭებული თანამშრომლები.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-4">
          <CompanyAttendanceSearch
            search={search}
            onChange={(value, replace) => {
              void navigate({ search: value, replace })
            }}
          />
        </div>
        <div aria-busy={query.isFetching}>
          {!query.isPending && query.isFetching ? (
            <span className="sr-only" role="status">
              თანამშრომლების სია ახლდება
            </span>
          ) : null}
          {query.isPending ? (
            <div role="status" aria-busy="true">
              <span className="sr-only">თანამშრომლები იტვირთება</span>
              <div aria-hidden="true" className="flex flex-col divide-y">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center gap-4 p-4">
                    <Skeleton className="size-8 rounded-full motion-reduce:animate-none" />
                    <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
                    <Skeleton className="ml-auto h-5 w-24 motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </div>
          ) : query.isError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertTitle>სია ვერ ჩაიტვირთა</AlertTitle>
                <AlertDescription>
                  სცადეთ ხელახლა. თუ პრობლემა განმეორდება, გადაამოწმეთ თქვენი
                  წვდომა.
                </AlertDescription>
                <AlertAction>
                  <Button
                    variant="outline"
                    depth="raised"
                    disabled={query.isFetching}
                    aria-busy={query.isFetching}
                    onClick={() => void refresh()}
                  >
                    {query.isFetching ? (
                      <Spinner aria-hidden="true" />
                    ) : (
                      <IconRefresh
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                    )}
                    ხელახლა ცდა
                  </Button>
                </AlertAction>
              </Alert>
            </div>
          ) : (
            <>
              {query.data.items.length ? (
                <CompanyAttendanceUsersTable
                  items={query.data.items}
                  search={search}
                />
              ) : (
                <div
                  className="flex flex-col items-center gap-3 px-6 py-12 text-center"
                  role="status"
                >
                  <div
                    className="flex size-12 items-center justify-center rounded-xl bg-muted"
                    aria-hidden="true"
                  >
                    {filtered ? (
                      <IconSearch className="size-5 text-muted-foreground" />
                    ) : (
                      <IconUsers className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <h2 className="text-base font-medium">
                    {(search.page ?? 1) > 1 && query.data.total > 0
                      ? 'ამ გვერდზე ჩანაწერები არ არის'
                      : filtered
                        ? 'შესაბამისი თანამშრომლები ვერ მოიძებნა'
                        : 'თანამშრომლები ჯერ არ არის'}
                  </h2>
                  {filtered ? (
                    <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                      შეცვალეთ ძიება ან ანგარიშის სტატუსი.
                    </p>
                  ) : null}
                  {filtered || (search.page ?? 1) > 1 ? (
                    <Button
                      variant="outline"
                      depth="raised"
                      nativeButton={false}
                      role="link"
                      render={<Link to="/manage/attendance" search={reset} />}
                    >
                      {filtered
                        ? 'ფილტრების გასუფთავება'
                        : 'პირველ გვერდზე დაბრუნება'}
                    </Button>
                  ) : null}
                </div>
              )}
              <div className="border-t px-4 py-3">
                <CompanyAttendancePagination
                  page={search.page ?? 1}
                  total={query.data.total}
                  pageSize={query.data.pageSize}
                  renderLink={(page) => (
                    <Link
                      to="/manage/attendance"
                      search={{ ...search, page }}
                    />
                  )}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
