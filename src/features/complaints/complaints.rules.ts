import { hasPermission } from '#/lib/authorization/permissions'
import type { PermissionSubject } from '#/lib/authorization/permissions'
import type { ComplaintStatus, ComplaintVisibility } from './complaints.schemas'

export type ComplaintScope = { id: string; authorization: PermissionSubject }
export type ScopedComplaint = {
  requesterId: string
  assigneeId: string | null
  visibility: ComplaintVisibility
}
export function canReviewComplaints(actor: ComplaintScope) {
  return (
    hasPermission(actor.authorization, 'complaints.review.all') ||
    hasPermission(actor.authorization, 'complaints.review.assigned')
  )
}
export function canReadComplaint(actor: ComplaintScope, item: ScopedComplaint) {
  if (item.requesterId === actor.id) return true
  if (item.visibility === 'hr_only')
    return (
      hasPermission(actor.authorization, 'complaints.review.all') &&
      hasPermission(actor.authorization, 'complaints.read.confidential')
    )
  return (
    hasPermission(actor.authorization, 'complaints.review.all') ||
    (item.assigneeId === actor.id &&
      hasPermission(actor.authorization, 'complaints.review.assigned'))
  )
}
export function canManageComplaint(
  actor: ComplaintScope,
  item: ScopedComplaint,
) {
  return item.requesterId !== actor.id && canReadComplaint(actor, item)
}
export function canAssignComplaint(
  actor: ComplaintScope,
  item: ScopedComplaint,
) {
  return (
    canManageComplaint(actor, item) &&
    hasPermission(actor.authorization, 'complaints.review.all')
  )
}
export function canChangeComplaintStatus(
  from: ComplaintStatus,
  to: ComplaintStatus,
) {
  return (
    (from === 'new' && (to === 'in_review' || to === 'closed')) ||
    (from === 'in_review' && (to === 'resolved' || to === 'closed')) ||
    ((from === 'resolved' || from === 'closed') && to === 'in_review')
  )
}
