import {
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  markOwnNotifications,
  markOwnNotificationsAsUnseen,
} from '../notifications.functions'
import { notificationKeys } from '../notifications.queries'

export function useMarkNotificationsSeen(actorId: string) {
  return useNotificationSeenState(actorId, true)
}

export function useMarkNotificationsUnseen(actorId: string) {
  return useNotificationSeenState(actorId, false)
}

function useNotificationSeenState(actorId: string, seen: boolean) {
  const client = useQueryClient()
  const pendingIds = useMutationState({
    filters: {
      mutationKey: [...notificationKeys.own(actorId), 'mark-seen'],
      status: 'pending',
    },
    select: (mutation) => {
      const ids = mutation.state.variables
      return Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === 'string')
        : []
    },
  }).flat()
  const mutation = useMutation({
    mutationKey: [...notificationKeys.own(actorId), 'mark-seen'],
    mutationFn: async (ids: Array<string>) => {
      const action = seen ? markOwnNotifications : markOwnNotificationsAsUnseen
      const result = await action({ data: { ids } })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    onSuccess: async () => {
      toast.success(
        seen
          ? 'შეტყობინებები ნანახად მოინიშნა.'
          : 'შეტყობინებები წაუკითხავად მოინიშნა.',
      )
      await client.invalidateQueries({
        queryKey: notificationKeys.own(actorId),
      })
    },
    onError: () => toast.error('მონიშვნა ვერ მოხერხდა. სცადეთ ხელახლა.'),
  })
  return { ...mutation, pendingIds }
}
