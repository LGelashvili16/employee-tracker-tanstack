import { describe, expect, it } from 'vitest'
import {
  createLeaveSchema,
  leaveSearchSchema,
  reviewLeaveSchema,
  cancelLeaveSchema,
} from './leave.schemas'

const input = {
  kind: 'day_off',
  startDate: '2026-11-09',
  endDate: '2026-11-09',
  note: '',
}
describe('leave boundary validation', () => {
  it('permits open-ended sick leave while requiring end dates for day offs and vacations', () => {
    expect(
      createLeaveSchema.parse({ ...input, kind: 'sick_leave', endDate: null }),
    ).toMatchObject({ kind: 'sick_leave', endDate: null })
    expect(
      createLeaveSchema.parse({ ...input, kind: 'sick_leave', endDate: '' })
        .endDate,
    ).toBeNull()
    for (const kind of ['day_off', 'vacation'])
      expect(
        createLeaveSchema.safeParse({ ...input, kind, endDate: null }).success,
      ).toBe(false)
    expect(
      createLeaveSchema.safeParse({
        ...input,
        kind: 'sick_leave',
        endDate: '2026-11-08',
      }).success,
    ).toBe(false)
  })
  it('validates cancellation identity and revision while ignoring client-supplied ownership', () => {
    const data = { id: '019a5e78-e000-7000-8000-000000000001', revision: 0 }
    expect(
      cancelLeaveSchema.parse({ ...data, requesterId: 'someone-else' }),
    ).toEqual(data)
    for (const value of [
      { ...data, id: 'invalid' },
      { ...data, revision: -1 },
      { id: data.id },
    ])
      expect(cancelLeaveSchema.safeParse(value).success).toBe(false)
  })
  it('supports a single day and vacations and removes client-supplied identity', () => {
    expect(
      createLeaveSchema.parse({ ...input, requesterId: 'someone-else' }),
    ).toEqual(input)
    expect(
      createLeaveSchema.safeParse({
        ...input,
        kind: 'vacation',
        endDate: '2026-12-09',
      }).success,
    ).toBe(true)
  })
  it.each([
    { startDate: '2026-02-30' },
    { endDate: '2026-11-08' },
    { endDate: '2027-11-10' },
    { endDate: '2026-11-10' },
    { kind: 'unknown' },
    { note: 'a'.repeat(501) },
    { startDate: '1999-12-31' },
  ])('rejects malformed or unbounded requests: %j', (change) => {
    expect(createLeaveSchema.safeParse({ ...input, ...change }).success).toBe(
      false,
    )
  })
  it('requires bounded search parameters and allowlisted sorting', () => {
    for (const value of [
      { page: 0 },
      { page: 1.5 },
      { page: 100001 },
      { q: 'a'.repeat(101) },
      { sort: 'DROP TABLE' },
      { status: 'unknown' },
    ])
      expect(leaveSearchSchema.safeParse(value).success).toBe(false)
  })
  it('allows an optional review description while requiring a valid revision and UUIDv7 target', () => {
    const review = {
      id: '019a5e78-e000-7000-8000-000000000001',
      revision: 0,
      action: 'approved',
      reason: 'დამტკიცებულია',
      startDate: input.startDate,
      endDate: input.endDate,
    }
    expect(reviewLeaveSchema.safeParse(review).success).toBe(true)
    for (const reason of ['', '   ', undefined, 'კი'])
      expect(reviewLeaveSchema.safeParse({ ...review, reason }).success).toBe(
        true,
      )
    for (const change of [
      { reason: 'ა'.repeat(501) },
      { revision: -1 },
      { id: 'another-user' },
      { action: 'deleted' },
    ])
      expect(
        reviewLeaveSchema.safeParse({ ...review, ...change }).success,
      ).toBe(false)
  })
})
