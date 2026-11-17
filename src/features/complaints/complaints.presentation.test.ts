import { expect, it } from 'vitest'
import { complaintDate } from './complaints.presentation'

it('formats complaint dates with Georgian month names and 24-hour company-local time', () => {
  expect(complaintDate('2026-11-11T10:05:00Z')).toBe('11 ნოემბერი 2026, 14:05')
  expect(complaintDate('2026-11-11T21:30:00Z')).toBe('12 ნოემბერი 2026, 01:30')
  expect(complaintDate('2026-01-01T00:00:00Z')).toBe('1 იანვარი 2026, 04:00')
})
