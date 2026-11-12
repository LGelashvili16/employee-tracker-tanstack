import type { NotificationDestination } from './notifications.schemas'

export type NotificationItem = {
  destination?: NotificationDestination | null
  id: string
  title: string
  body: string
  announcementId?: string | null
  complaintId?: string | null
  complaintReview?: boolean
  createdAt: string
  seenAt: string | null
}

export type NotificationList = {
  items: Array<NotificationItem>
  unseenCount: number
  hasMore: boolean
}
