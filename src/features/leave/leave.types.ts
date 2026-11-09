export type LeaveItem = {
  id: string
  requesterId: string
  name: string
  image: string | null
  kind: 'day_off' | 'vacation' | 'sick_leave'
  startDate: string
  endDate: string | null
  note: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  canCancel: boolean
  revision: number
  reviewReason: string
  reviewerName: string | null
  createdAt: string
}
export type LeaveList = {
  items: Array<LeaveItem>
  total: number
  pageSize: number
}

/** Minimal approved absence facts used by attendance; notes and review details stay in the vacation workflow. */
export type ApprovedLeave = Pick<LeaveItem, 'kind' | 'startDate' | 'endDate'>
