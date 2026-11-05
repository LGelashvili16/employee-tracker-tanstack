export type NotificationItem = {
  id: string
  title: string
  body: string
  createdAt: string
  seenAt: string | null
}

export type NotificationList = {
  items: Array<NotificationItem>
  unseenCount: number
  hasMore: boolean
}
