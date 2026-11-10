export type AnnouncementSummary = {
  id: string
  title: string
  publishedAt: string
  showOnLogin: boolean
  readAt: string | null
}
export type AnnouncementDetail = AnnouncementSummary & {
  body: string
  isRecipient?: boolean
}
export type AnnouncementListItem = AnnouncementSummary & { authorName: string }
