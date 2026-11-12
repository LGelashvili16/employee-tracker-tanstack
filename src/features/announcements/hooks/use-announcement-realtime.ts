import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { buttonVariants } from '#/components/ui/button'
import { useRealtimeEvents } from '#/hooks/use-realtime-events'
import { announcementKeys } from '../announcements.queries'
import { announcementRealtimeSchema } from '../announcements-realtime.schemas'

export function useAnnouncementRealtime(actorId: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [received] = useState(() => new Set<string>())
  const client = useQueryClient()
  const navigate = useNavigate()
  useRealtimeEvents('announcements', (input) => {
    const parsed = announcementRealtimeSchema.safeParse(input)
    if (!parsed.success) return
    const { unreadCount: count, published } = parsed.data
    setUnreadCount(count)
    void client.invalidateQueries({ queryKey: announcementKeys.all(actorId) })
    if (!published || published.showOnLogin || received.has(published.id))
      return
    received.add(published.id)
    if (received.size > 256) received.delete(received.values().next().value!)
    toast('ახალი განცხადება გამოქვეყნდა', {
      id: `announcement:${published.id}`,
      description: published.title,
      duration: 6000,
      position: 'bottom-right',
      classNames: { actionButton: buttonVariants({ size: 'sm' }) },
      action: {
        label: 'ნახვა',
        onClick: () => {
          void navigate({
            to: '/announcements',
            search: { announcementId: published.id },
          })
        },
      },
    })
  })
  return { hasUnreadAnnouncements: unreadCount > 0 }
}
