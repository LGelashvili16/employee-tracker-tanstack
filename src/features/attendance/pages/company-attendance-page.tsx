import { getRouteApi, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { CompanyAttendanceNavigation } from '../components/company-attendance-navigation'
import { CompanyAttendanceSearch } from '../components/company-attendance-search'
import { CompanyAttendanceUsersTable } from '../components/company-attendance-users-table'
import { CompanyAttendancePagination } from '../components/company-attendance-pagination'
import { companyAttendanceUsersQuery } from '../company-attendance.queries'

const route = getRouteApi('/_authenticated/admin/attendance/')
export function CompanyAttendancePage() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const query = useQuery(companyAttendanceUsersQuery(actor.id, search))
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <CompanyAttendanceNavigation />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">თანამშრომლების დასწრება</h1>
        <p className="text-sm text-muted-foreground">
          აირჩიეთ თანამშრომელი მისი დასწრების ისტორიის სანახავად. სიაში ჩანს
          ანგარიშები ჩანაწერების გარეშეც.
        </p>
      </div>
      <CompanyAttendanceSearch
        key={search.q ?? ''}
        q={search.q ?? ''}
        onSearch={(q) => {
          void navigate({ search: { ...search, q, page: 1 } })
        }}
      />
      {query.isPending ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">თანამშრომლები იტვირთება</span>
          <Skeleton
            aria-hidden="true"
            className="h-64 w-full motion-reduce:animate-none"
          />
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            თანამშრომლები ვერ ჩაიტვირთა. სცადეთ ხელახლა.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {query.data.items.length ? (
            <CompanyAttendanceUsersTable
              items={query.data.items}
              search={search}
            />
          ) : (
            <p className="rounded-xl border p-6 text-sm text-muted-foreground">
              თანამშრომლები არ მოიძებნა.
            </p>
          )}
          <CompanyAttendancePagination
            page={search.page ?? 1}
            total={query.data.total}
            pageSize={query.data.pageSize}
            renderLink={(page) => (
              <Link to="/admin/attendance" search={{ ...search, page }} />
            )}
          />
        </>
      )}
    </section>
  )
}
