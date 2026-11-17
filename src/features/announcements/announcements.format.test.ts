import { expect, it } from 'vitest'
import { formatAnnouncementDate } from './announcements.format'

it('renders Georgian month names using date-fns locale data', () => {
  expect(formatAnnouncementDate('2026-11-10T09:00:00Z')).toBe(
    '10 ნოემბერი, 2026',
  )
})

it('uses the Tbilisi calendar date when the UTC day and year differ', () => {
  expect(formatAnnouncementDate('2026-12-31T21:00:00Z')).toBe('1 იანვარი, 2027')
})
