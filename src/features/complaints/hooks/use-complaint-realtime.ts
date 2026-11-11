import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { buttonVariants } from '#/components/ui/button'
import { useRealtimeEvents } from '#/hooks/use-realtime-events'
import { notificationKeys } from '#/features/notifications/notifications.queries'
import { complaintKeys } from '../complaints.queries'
import { complaintRealtimeSchema } from '../complaints.schemas'

export function useComplaintRealtime(actorId: string) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const [hasUnreadComplaints, setHasUnreadComplaints] = useState(false)
  const [received] = useState(() => new Set<string>())
  useRealtimeEvents('complaints', (input) => {
    const parsed = complaintRealtimeSchema.safeParse(input)
    if (!parsed.success) return
    const {
      changed,
      id,
      notification,
      hasUnreadComplaints: unread,
    } = parsed.data
    setHasUnreadComplaints(unread)
    void client.invalidateQueries({ queryKey: complaintKeys.all(actorId) })
    void client.invalidateQueries({ queryKey: notificationKeys.own(actorId) })
    if (!changed || !id || !notification || received.has(notification.id))
      return
    received.add(notification.id)
    if (received.size > 256) received.delete(received.values().next().value!)
    toast('საჩივრის განახლება', {
      id: `complaint:${notification.id}`,
      duration: 6000,
      position: 'bottom-right',
      classNames: { actionButton: buttonVariants({ size: 'sm' }) },
      action: {
        label: 'ნახვა',
        onClick: () => {
          void navigate({
            to: notification.review ? '/manage/complaints' : '/complaints',
            search: { complaintId: id },
          })
        },
      },
    })
  })
  return { hasUnreadComplaints }
}
