import { describe, expect, it } from 'vitest'
import { formatLeaveDate } from './leave.presentation'

describe('Georgian vacation dates', () => {
  it('displays the full Georgian month and preserves calendar dates', () => {
    expect(formatLeaveDate('2026-11-10')).toBe('10 ნოემბერი 2026')
    expect(formatLeaveDate('2027-01-01')).toBe('1 იანვარი 2027')
    expect(formatLeaveDate('2028-02-29')).toBe('29 თებერვალი 2028')
  })
})
