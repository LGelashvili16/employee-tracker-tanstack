import { describe, expect, it } from 'vitest'
import {
  formatTimesheetMonth,
  shiftTimesheetMonth,
  timesheetMonthBounds,
} from './timesheets.rules'
import {
  timesheetRequestSchema,
  employeeTimesheetSearchSchema,
} from './timesheets.schemas'

describe('timesheet periods', () => {
  it('validates the employee detail tab and its independent timesheet filters', () => {
    for (const value of [
      { view: 'unknown' },
      { hoursPage: -1 },
      { hoursPage: 10001 },
      { hoursSort: 'unsafe' },
      { hoursStatus: 'unsafe' },
      { month: '2026-13' },
    ])
      expect(employeeTimesheetSearchSchema.safeParse(value).success).toBe(false)
    expect(
      employeeTimesheetSearchSchema.safeParse({
        view: 'timesheet',
        hoursPage: 0,
        hoursStatus: 'approved',
        month: '2026-11',
      }).success,
    ).toBe(true)
  })
  it('uses calendar months including leap years and year changes', () => {
    expect(timesheetMonthBounds('2024-02')).toEqual({
      start: '2024-02-01',
      end: '2024-03-01',
    })
    expect(timesheetMonthBounds('2026-12')).toEqual({
      start: '2026-12-01',
      end: '2027-01-01',
    })
    expect(shiftTimesheetMonth('2026-01', -1)).toBe('2025-12')
    expect(formatTimesheetMonth('2026-11')).toBe('ნოემბერი 2026')
  })
  it('rejects invalid periods, identifiers and unbounded pagination', () => {
    for (const input of [
      { month: '2026-13' },
      { month: '1999-12' },
      { month: '2026-11', page: -1 },
      { month: '2026-11', userId: '../private' },
      { q: 'ა'.repeat(101) },
      { sort: 'unsafe' },
      { status: 'unsafe' },
    ]) {
      expect(timesheetRequestSchema.safeParse(input).success).toBe(false)
    }
  })
})
