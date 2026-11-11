import { expect, it } from 'vitest'
import {
  canAssignComplaint,
  canChangeComplaintStatus,
  canManageComplaint,
  canReadComplaint,
} from './complaints.rules'
import {
  createComplaintSchema,
  complaintSearchSchema,
  complaintReplySchema,
} from './complaints.schemas'
import type { Role } from '#/lib/authorization/permissions'

const actor = (id: string, role: Role) => ({ id, authorization: [role] })
const standard = {
  requesterId: 'worker',
  assigneeId: 'supervisor',
  visibility: 'standard' as const,
}
it('keeps ownership, assigned review and confidential permissions separate', () => {
  expect(canReadComplaint(actor('worker', 'employee'), standard)).toBe(true)
  expect(canManageComplaint(actor('worker', 'hr_manager'), standard)).toBe(
    false,
  )
  expect(canManageComplaint(actor('supervisor', 'supervisor'), standard)).toBe(
    true,
  )
  expect(canAssignComplaint(actor('supervisor', 'supervisor'), standard)).toBe(
    false,
  )
  expect(canReadComplaint(actor('other', 'supervisor'), standard)).toBe(false)
  const confidential = { ...standard, visibility: 'hr_only' as const }
  expect(
    canReadComplaint(actor('supervisor', 'supervisor'), confidential),
  ).toBe(false)
  expect(canReadComplaint(actor('hr', 'hr_manager'), confidential)).toBe(true)
  expect(canReadComplaint(actor('admin', 'admin'), confidential)).toBe(false)
  expect(canReadComplaint(actor('owner', 'owner'), confidential)).toBe(true)
})
it('requires review before resolution and allows explicit reopening', () => {
  expect(canChangeComplaintStatus('new', 'resolved')).toBe(false)
  expect(canChangeComplaintStatus('new', 'in_review')).toBe(true)
  expect(canChangeComplaintStatus('in_review', 'resolved')).toBe(true)
  expect(canChangeComplaintStatus('closed', 'in_review')).toBe(true)
  expect(canChangeComplaintStatus('resolved', 'new')).toBe(false)
})
it('validates bounded content, pagination, identifiers and writable fields', () => {
  const value = {
    submissionId: '019aac01-0000-7000-8000-000000000001',
    title: ' თემა ',
    description: ' აღწერა ',
    category: 'other',
  }
  expect(createComplaintSchema.parse(value).title).toBe('თემა')
  for (const invalid of [
    { ...value, title: ' ' },
    { ...value, requesterId: 'other' },
    { ...value, description: 'x'.repeat(5001) },
    { ...value, visibility: 'public' },
    { ...value, visibility: 'hr_only' },
    { ...value, visibility: 'standard' },
  ])
    expect(createComplaintSchema.safeParse(invalid).success).toBe(false)
  expect(complaintSearchSchema.safeParse({ page: -1 }).success).toBe(false)
  expect(complaintSearchSchema.safeParse({ complaintId: 'bad' }).success).toBe(
    false,
  )
  expect(
    complaintReplySchema.safeParse({
      id: value.submissionId,
      submissionId: value.submissionId,
      body: '',
    }).success,
  ).toBe(false)
})
