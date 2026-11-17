import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { buttonVariants } from '#/components/ui/button'
import { useRealtimeEvents } from '#/hooks/use-realtime-events'
import { notificationRealtimeSchema } from '../notifications.schemas'
import { notificationKeys } from '../notifications.queries'
import { notificationDestination } from '../notification-destination'

export function useNotificationRealtime(actorId: string) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const [received] = useState(() => new Set<string>())
  useRealtimeEvents('notifications', (input) => {
    const parsed = notificationRealtimeSchema.safeParse(input)
    if (!parsed.success || parsed.data.recipientId !== actorId) return
    void client.invalidateQueries({ queryKey: notificationKeys.own(actorId) })
    const { changed, notification } = parsed.data
    if (
      !changed ||
      !notification ||
      notification.liveToast === false ||
      received.has(notification.id)
    )
      return
    received.add(notification.id)
    if (received.size > 256) received.delete(received.values().next().value!)
    const destination = notificationDestination(
      notification.destination,
      actorId,
    )
    toast(notification.title, {
      id: `notification:${notification.id}`,
      duration: 6000,
      position: 'bottom-right',
      classNames: { actionButton: buttonVariants({ size: 'sm' }) },
      ...(destination
        ? {
            action: {
              label: 'ნახვა',
              onClick: () => {
                void navigate(destination)
              },
            },
          }
        : {}),
    })
  })
}
