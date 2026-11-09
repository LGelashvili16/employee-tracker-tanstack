import { queryOptions } from '@tanstack/react-query'
import { getAdminAccounts } from './admin-access.functions'
import type { AdminAccountSearch } from './admin-access.schemas'

export const adminAccountKeys = { all: ['admin-accounts'] as const }
export function adminAccountsQueryOptions(
  actorId: string,
  search: AdminAccountSearch,
) {
  return queryOptions({
    queryKey: [...adminAccountKeys.all, actorId, search],
    queryFn: () =>
      getAdminAccounts({
        data: {
          ...search,
          page: search.page ?? 1,
          q: search.q ?? '',
          sort: search.sort ?? 'name-asc',
        },
      }),
    retry: false,
  })
}
