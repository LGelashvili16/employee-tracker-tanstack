import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { pendingAnnouncementQuery } from '../announcements.queries'
import { AnnouncementDialog } from './announcement-dialog'

/** Session time and persisted acknowledgements determine eligibility on the server. No browser storage is used. */
export function LoginAnnouncement({ actorId }: { actorId: string }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const browsing =
    pathname === '/announcements' || pathname === '/manage/announcements'
  const query = useQuery({
    ...pendingAnnouncementQuery(actorId),
    enabled: !browsing,
  })
  if (browsing || !query.data) return null
  return (
    <AnnouncementDialog
      key={query.data.id}
      actorId={actorId}
      value={query.data}
      automatic
      onClose={() => {}}
    />
  )
}
