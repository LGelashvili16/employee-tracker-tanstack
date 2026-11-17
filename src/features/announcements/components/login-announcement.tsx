import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { pendingAnnouncementQuery } from '../announcements.queries'
import { AnnouncementDialog } from './announcement-dialog'

/** The server owns pending order and sign-in reminder state; SSE invalidates this query on arrival. */
export function LoginAnnouncement({ actorId }: { actorId: string }) {
  const reading = useLocation({
    select: (location) => Boolean(location.search.announcementId),
  })
  const [completed, setCompleted] = useState(0)
  const query = useQuery({
    ...pendingAnnouncementQuery(actorId),
    enabled: !reading,
  })
  const pending = query.data
  const item = pending?.item
  if (reading || !pending || !item) return null
  return (
    <AnnouncementDialog
      key={item.id}
      actorId={actorId}
      value={item}
      automatic
      progress={{
        current: completed + 1,
        total: completed + pending.remaining,
      }}
      onClose={() =>
        setCompleted((count) => (pending.remaining > 1 ? count + 1 : 0))
      }
    />
  )
}
