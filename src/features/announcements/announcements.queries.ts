import { queryOptions } from '@tanstack/react-query'
import {
  getAnnouncementDetail,
  getAnnouncements,
  getPendingAnnouncement,
} from './announcements.functions'
import type { AnnouncementSearch } from './announcements.schemas'

export const announcementKeys = {
  all: (actorId: string) => ['announcements', actorId] as const,
}
export const announcementsQuery = (
  actorId: string,
  search: AnnouncementSearch,
) =>
  queryOptions({
    queryKey: [
      ...announcementKeys.all(actorId),
      'list',
      search.page,
      search.q,
      search.status,
      search.sort,
    ],
    queryFn: async () => {
      const result = await getAnnouncements({ data: search })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    retry: false,
  })
export const announcementDetailQuery = (actorId: string, id: string) =>
  queryOptions({
    queryKey: [...announcementKeys.all(actorId), 'detail', id],
    queryFn: async () => {
      const result = await getAnnouncementDetail({ data: { id } })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    retry: false,
  })
export const pendingAnnouncementQuery = (actorId: string) =>
  queryOptions({
    queryKey: [...announcementKeys.all(actorId), 'login'],
    queryFn: async () => {
      const result = await getPendingAnnouncement()
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    staleTime: Infinity,
    // Recheck a new application mount, including signing back into the same account.
    refetchOnMount: 'always',
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
