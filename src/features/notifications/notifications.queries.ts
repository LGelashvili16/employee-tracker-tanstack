import { queryOptions } from '@tanstack/react-query'
import { getOwnNotifications } from './notifications.functions'

export const notificationKeys = {
  own: (actorId: string) => ['notifications', actorId] as const,
}

export const notificationsQueryOptions = (
  actorId: string,
  limit = 5,
  offset = 0,
) =>
  queryOptions({
    queryKey: [...notificationKeys.own(actorId), limit, offset],
    queryFn: async () => {
      const result = await getOwnNotifications({ data: { limit, offset } })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    staleTime: 30_000,
    // Refresh the bell in visible tabs without polling in the background.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false,
  })
