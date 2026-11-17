import { queryOptions } from '@tanstack/react-query'
import { getComplaint, getComplaints } from './complaints.functions'
import type { ComplaintSearch } from './complaints.schemas'

export const complaintKeys = {
  all: (actorId: string) => ['complaints', actorId] as const,
}
export function complaintListOptions(
  actorId: string,
  search: ComplaintSearch,
  review: boolean,
) {
  const filters = {
    q: search.q,
    status: search.status,
    sort: search.sort,
    page: search.page,
  }
  return queryOptions({
    queryKey: [...complaintKeys.all(actorId), 'list', review, filters],
    queryFn: async () => {
      const result = await getComplaints({ data: { ...filters, review } })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
  })
}
export function complaintDetailOptions(actorId: string, id: string, page = 1) {
  return queryOptions({
    queryKey: [...complaintKeys.all(actorId), 'detail', id, page],
    queryFn: async () => {
      const result = await getComplaint({ data: { id, page } })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
  })
}
type ComplaintListResult = Extract<
  Awaited<ReturnType<typeof getComplaints>>,
  { ok: true }
>['value']
export type ComplaintItem = ComplaintListResult['items'][number]
export type ComplaintDetail = Extract<
  Awaited<ReturnType<typeof getComplaint>>,
  { ok: true }
>['value']
