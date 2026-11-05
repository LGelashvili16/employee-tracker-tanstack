import { describe, expect, it } from 'vitest'
import { needsSessionReview, sessionMetrics } from './attendance.rules'
import {
  attendanceCorrectionSchema,
  attendanceLimitSchema,
  attendanceListSchema,
} from './attendance.schemas'

const start = '2026-11-04T06:00:00Z'
const end = '2026-11-04T15:00:00Z'
describe('actual attendance and schedule deviations', () => {
  it.each([
    [
      '2026-11-04T04:00:00Z',
      '2026-11-04T16:00:00Z',
      12 * 3600,
      2 * 3600,
      0,
      0,
      3 * 3600,
    ],
    [
      '2026-11-04T05:00:00Z',
      '2026-11-04T14:00:00Z',
      9 * 3600,
      3600,
      0,
      3600,
      3600,
    ],
    ['2026-11-04T07:00:00Z', '2026-11-04T15:00:00Z', 8 * 3600, 0, 3600, 0, 0],
    [
      '2026-11-04T18:58:00Z',
      '2026-11-04T20:15:00Z',
      77 * 60,
      0,
      12 * 3600 + 58 * 60,
      0,
      77 * 60,
    ],
  ])(
    'measures %s through %s without deducting breaks',
    (
      from,
      to,
      seconds,
      earlyStartSeconds,
      lateSeconds,
      earlySeconds,
      outsideSeconds,
    ) => {
      expect(sessionMetrics(from, to, start, end, to)).toMatchObject({
        seconds,
        earlyStartSeconds,
        lateSeconds,
        earlySeconds,
        outsideSeconds,
      })
    },
  )
  it('counts only actual portions outside the schedule, including sessions wholly before it', () => {
    expect(
      sessionMetrics(
        '2026-11-04T04:00:00Z',
        '2026-11-04T05:00:00Z',
        start,
        end,
        end,
      ),
    ).toMatchObject({ earlyStartSeconds: 2 * 3600, outsideSeconds: 3600 })
    expect(
      sessionMetrics(start, null, start, end, '2026-11-04T16:00:00Z'),
    ).toMatchObject({ earlySeconds: 0, afterScheduleSeconds: 3600 })
  })
  it('uses elapsed session length rather than midnight for the warning', () => {
    expect(
      needsSessionReview('2026-11-04T18:58:00Z', '2026-11-04T20:15:00Z', 16),
    ).toBe(false)
    expect(needsSessionReview(start, '2026-11-04T22:00:00Z', 16)).toBe(true)
  })
  it('validates corrections, page bounds and configurable thresholds', () => {
    const value = {
      sessionId: '019a4fb0-1234-7000-8000-123456789012',
      revision: 1,
      reason: 'დროის გადამოწმება',
      start: '2026-11-04T10:00',
      end: '2026-11-04T19:00',
    }
    expect(attendanceCorrectionSchema.safeParse(value).success).toBe(true)
    for (const invalidEnd of [
      '2026-02-30T19:00',
      '2026-11-04T09:00',
      'invalid',
    ])
      expect(
        attendanceCorrectionSchema.safeParse({ ...value, end: invalidEnd })
          .success,
      ).toBe(false)
    expect(
      attendanceLimitSchema.safeParse({
        maxOpenHours: 7,
        revision: 0,
        reason: 'ცვლილება',
      }).success,
    ).toBe(false)
    expect(attendanceListSchema.safeParse({ page: -1 }).success).toBe(false)
  })
})
