import { queryOptions } from '@tanstack/react-query'
import { getOwnLeave, getReviewLeave } from './leave.functions'
import type { LeaveSearch } from './leave.schemas'

export const leaveKey = ['leave'] as const
export function leaveListQuery(
  actorId: string,
  search: LeaveSearch,
  review: boolean,
) {
  return queryOptions({
    queryKey: [...leaveKey, actorId, review ? 'review' : 'own', search],
    queryFn: async () => {
      const result = await (review ? getReviewLeave : getOwnLeave)({
        data: search,
      })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    retry: false,
    staleTime: 15_000,
  })
}
