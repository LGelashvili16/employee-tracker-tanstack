import { describe, expect, it } from 'vitest'
import {
  companyLocalDate,
  earliestScheduleDate,
  followingDate,
  formatDuration,
  isoWeekday,
  sameWorkingWeek,
  shiftMinutes,
  weeklyTimeline,
} from './scheduling.rules'

describe('week durations', () => {
  it('uses one scale for comparable shifts and preserves minute precision', () => {
    const scale = weeklyTimeline([
      { weekday: 1, hours: { start: '09:15', end: '17:30' } },
      { weekday: 2, hours: { start: '10:00', end: '19:00' } },
    ])
    expect(scale.ticks).toEqual([540, 720, 900, 1080, 1260])
    expect(scale.position('09:15')).toBeCloseTo(2.0833)
    expect(scale.position('19:00')).toBeCloseTo(83.3333)
  })
  it('includes early and late shifts without clipping or invalid empty scales', () => {
    const scale = weeklyTimeline([
      { weekday: 1, hours: { start: '00:00', end: '00:15' } },
      { weekday: 2, hours: { start: '23:30', end: '23:59' } },
    ])
    expect(scale.start).toBe(0)
    expect(scale.end).toBe(1440)
    expect(scale.position('23:59')).toBeLessThan(100)
    expect(weeklyTimeline([{ weekday: 1, hours: null }]).ticks).toHaveLength(9)
  })
  it('formats shift lengths and finds the weekday of a date', () => {
    expect(shiftMinutes({ start: '09:00', end: '17:30' })).toBe(510)
    expect(formatDuration(510)).toBe('8 სთ 30 წთ')
    expect(formatDuration(480)).toBe('8 სთ')
    expect(isoWeekday('2026-11-05')).toBe(4)
    expect(isoWeekday('2026-11-08')).toBe(7)
  })
})

describe('working week comparison', () => {
  const week = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday,
    hours: weekday < 6 ? { start: '09:00', end: '18:00' } : null,
  }))
  it('ignores day order and detects changed hours', () => {
    expect(sameWorkingWeek(week, [...week].reverse())).toBe(true)
    expect(
      sameWorkingWeek(
        week,
        week.map((day) =>
          day.weekday === 1
            ? { ...day, hours: { start: '10:00', end: '18:00' } }
            : day,
        ),
      ),
    ).toBe(false)
    expect(
      sameWorkingWeek(
        week,
        week.map((day) =>
          day.weekday === 6
            ? { ...day, hours: { start: '09:00', end: '13:00' } }
            : day,
        ),
      ),
    ).toBe(false)
  })
})

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
