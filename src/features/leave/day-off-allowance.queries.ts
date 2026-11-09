import { queryOptions } from '@tanstack/react-query'
import {
  getDayOffSettings,
  getOwnDayOffBalance,
  getEmployeeDayOffBalance,
} from './day-off-allowance.functions'

export const dayOffAllowanceKey = ['day-off-allowance'] as const
export function dayOffSettingsQuery() {
  return queryOptions({
    queryKey: [...dayOffAllowanceKey, 'settings'],
    queryFn: async () => {
      const result = await getDayOffSettings()
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    retry: false,
    staleTime: 15000,
  })
}
export function ownDayOffBalanceQuery(actorId: string) {
  return queryOptions({
    queryKey: [...dayOffAllowanceKey, 'own', actorId],
    queryFn: async () => {
      const result = await getOwnDayOffBalance()
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    retry: false,
    staleTime: 15000,
    refetchInterval: 60000,
  })
}
export function employeeDayOffBalanceQuery(actorId: string, userId: string) {
  return queryOptions({
    queryKey: [...dayOffAllowanceKey, 'employee', actorId, userId],
    queryFn: async () => {
      const result = await getEmployeeDayOffBalance({ data: { userId } })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    retry: false,
    staleTime: 15000,
  })
}
