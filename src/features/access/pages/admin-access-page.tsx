import { useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { AccountDirectorySearch } from '#/components/common/account-directory-search'
import { DataPagination } from '#/components/common/data-pagination'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { adminAccountsQueryOptions } from '../admin-access.queries'
import { AdminAccountDialog } from '../components/admin-account-dialog'
import { AdminAccountsTable } from '../components/admin-accounts-table'
import type { AdminAccountAction } from '../components/admin-account-dialog'
import type { AdminAccount } from '../admin-access.types'

const route = getRouteApi('/_authenticated/admin/access')
export function AdminAccessPage() {
  const { actor } = route.useRouteContext()
  return <AdminAccessCache key={actor.id} />
}
function AdminAccessCache() {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <AdminAccountsWorkspace />
    </QueryClientProvider>
  )
}
function AdminAccountsWorkspace() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [dialog, setDialog] = useState<{
    account: AdminAccount
    action: AdminAccountAction | 'authorization'
  } | null>(null)
  const query = useQuery(adminAccountsQueryOptions(actor.id, search))
  const data = !query.isError && query.data?.ok ? query.data.value : null
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        მომხმარებლების წვდომა
      </h1>
      <Alert role="note" variant="info">
        <AlertDescription>
          {actor.roles.includes('owner')
            ? 'საკუთარ ანგარიშზე წვდომის ცვლილებები დაუშვებელია.'
            : 'მფლობელის ანგარიში დაცულია. საკუთარ ანგარიშზე წვდომის ცვლილებები დაუშვებელია.'}
        </AlertDescription>
      </Alert>
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-4">
          <AccountDirectorySearch
            searchLabel="მომხმარებლის ძიება"
            search={search}
            onChange={(value, replace) => {
              void navigate({ search: value, replace })
            }}
          />
        </div>
        <div aria-busy={query.isFetching}>
          {!query.isPending && query.isFetching ? (
            <span className="sr-only" role="status">
              ანგარიშების სია ახლდება
            </span>
          ) : null}
          {query.isPending ? (
            <div
              role="status"
              aria-busy="true"
              className="flex flex-col gap-4 p-4"
            >
              <span className="sr-only">ანგარიშები იტვირთება</span>
              <div aria-hidden="true" className="flex flex-col gap-4">
                <Skeleton className="h-10 w-full motion-reduce:animate-none" />
                {[1, 2, 3].map((row) => (
                  <div
                    key={row}
                    className="grid grid-cols-[2fr_2fr_1fr_auto] items-center gap-4 border-b pb-4"
                  >
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-3/4 motion-reduce:animate-none" />
                      <Skeleton className="h-3 w-1/2 motion-reduce:animate-none" />
                    </div>
                    <Skeleton className="h-4 w-3/4 motion-reduce:animate-none" />
                    <Skeleton className="h-5 w-16 motion-reduce:animate-none" />
                    <Skeleton className="size-7 motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </div>
          ) : !data ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription>
                  {query.data && !query.data.ok
                    ? query.data.message
                    : 'ანგარიშები ვერ ჩაიტვირთა. განაახლეთ გვერდი.'}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              {data.items.length ? (
                <AdminAccountsTable
                  items={data.items}
                  actor={actor}
                  search={search}
                  onAction={(account, action) => setDialog({ account, action })}
                />
              ) : (
                <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                  {search.q || (search.state && search.state !== 'all')
                    ? 'შესაბამისი ანგარიშები ვერ მოიძებნა.'
                    : 'ანგარიშები არ არის.'}
                </p>
              )}
              <div className="border-t px-4 py-3">
                <DataPagination
                  page={search.page ?? 1}
                  total={data.total}
                  pageSize={20}
                  renderLink={(page) => (
                    <Link to="/admin/access" search={{ ...search, page }} />
                  )}
                />
              </div>
            </>
          )}
        </div>
      </div>
      {dialog ? (
        <AdminAccountDialog
          account={dialog.account}
          action={dialog.action}
          owner={actor.roles.includes('owner')}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </section>
  )
}
