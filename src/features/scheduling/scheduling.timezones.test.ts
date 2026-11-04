import { describe, expect, it } from 'vitest'
import { scheduleTimezoneOffset } from './scheduling.timezones'

describe('timezone option offsets', () => {
  it('includes explicit offsets for Tbilisi and UTC', () => {
    expect(scheduleTimezoneOffset('Asia/Tbilisi', '2026-11-04')).toBe(
      'UTC+04:00',
    )
    expect(scheduleTimezoneOffset('UTC', '2026-11-04')).toBe('UTC+00:00')
  })
  it('follows daylight saving on the effective date', () => {
    expect(scheduleTimezoneOffset('Europe/Berlin', '2026-01-15')).toBe(
      'UTC+01:00',
    )
    expect(scheduleTimezoneOffset('Europe/Berlin', '2026-07-15')).toBe(
      'UTC+02:00',
    )
    expect(scheduleTimezoneOffset('America/New_York', '2026-01-15')).toBe(
      'UTC-05:00',
    )
    expect(scheduleTimezoneOffset('America/New_York', '2026-07-15')).toBe(
      'UTC-04:00',
    )
  })
})
