import { afterEach, expect, it, vi } from 'vitest'
import {
  formatJobsRange,
  jobCalendarDate,
  jobCalendarDateString,
  jobsMonthRange,
  jobsToday,
} from './jobs.dates'
import { jobDateRangeSchema, jobSearchSchema } from './jobs.schemas'

afterEach(() => vi.useRealTimers())
it('defaults to the current Tbilisi month at the UTC month boundary and handles leap years', () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-31T20:05:00Z'))
  expect(jobsToday()).toBe('2026-11-01')
  expect(jobSearchSchema.parse({})).toMatchObject({
    from: '2026-11-01',
    to: '2026-11-30',
  })
  expect(jobsMonthRange('2024-02')).toEqual({
    from: '2024-02-01',
    to: '2024-02-29',
  })
  expect(jobsMonthRange('2025-02').to).toBe('2025-02-28')
  expect(jobCalendarDateString(jobCalendarDate('2026-11-01'))).toBe(
    '2026-11-01',
  )
  expect(formatJobsRange({ from: '2026-11-01', to: '2026-11-30' })).toBe(
    '01.11.2026 - 30.11.2026',
  )
})
it('validates full calendar dates, single-day ranges and malformed URLs in Georgian', () => {
  expect(
    jobDateRangeSchema.parse({ from: '2026-11-06', to: '2026-11-06' }).to,
  ).toBe('2026-11-06')
  for (const input of [
    { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-11-01' },
    { to: '2026-11-30' },
    { from: '2026-11-30', to: '2026-11-01' },
    { from: '1899-01-01', to: '2026-01-01' },
    { from: '2026-01-01', to: '2101-01-01' },
  ]) {
    const parsed = jobSearchSchema.safeParse(input)
    expect(parsed.success).toBe(false)
    if (!parsed.success)
      expect(
        parsed.error.issues.every((issue) => /[ა-ჰ]/.test(issue.message)),
      ).toBe(true)
  }
})
