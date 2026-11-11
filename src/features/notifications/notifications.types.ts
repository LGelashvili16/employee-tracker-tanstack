export type NotificationItem = {
  id: string
  title: string
  body: string
  announcementId?: string | null
  complaintId?: string | null
  createdAt: string
  seenAt: string | null
}

export type NotificationList = {
  items: Array<NotificationItem>
  unseenCount: number
  hasMore: boolean
}
