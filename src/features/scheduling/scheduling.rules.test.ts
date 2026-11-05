import { describe, expect, it } from 'vitest'
import {
  companyLocalDate,
  earliestScheduleDate,
  followingDate,
} from './scheduling.rules'

describe('company-local schedule dates', () => {
  it('uses the company date across midnight instead of the UTC date', () => {
    const now = new Date('2026-11-04T21:00:00Z')
    expect(companyLocalDate(now, 'Asia/Tbilisi')).toBe('2026-11-05')
    expect(companyLocalDate(now, 'America/New_York')).toBe('2026-11-04')
  })
  it('handles leap days and year boundaries without host timezone arithmetic', () => {
    expect(followingDate('2028-02-28')).toBe('2028-02-29')
    expect(followingDate('2026-12-31')).toBe('2027-01-01')
  })
  it('permits today only for the first version and appends after the latest future version', () => {
    expect(earliestScheduleDate('2026-11-04', null)).toBe('2026-11-04')
    expect(earliestScheduleDate('2026-11-04', '2026-10-01')).toBe('2026-11-05')
    expect(earliestScheduleDate('2026-11-04', '2026-12-01')).toBe('2026-12-02')
  })
})
