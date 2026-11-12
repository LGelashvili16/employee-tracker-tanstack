import { expect, it } from 'vitest'
import { formatJobDate } from './jobs.presentation'

it('formats Tbilisi instants without browser-dependent English month names or AM/PM', () => {
  expect(formatJobDate('2026-11-06T10:00:00Z')).toBe('6 ნოემბერი, 2026, 14:00')
  expect(formatJobDate('2026-11-06T22:15:00Z')).toBe('7 ნოემბერი, 2026, 02:15')
})
