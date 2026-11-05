import { describe, expect, it } from 'vitest'
import {
  elapsedSeconds,
  formatAttendanceDuration,
  formatAttendanceTime,
  formatWorkedTime,
  startOfWorkWeek,
} from './attendance.rules'

describe('attendance time display and calendar rules', () => {
  it('formats attendance durations as hours and rounded-up minutes without wrapping at 24 hours', () => {
    expect(formatAttendanceDuration(503 * 60)).toBe('08:23')
    expect(formatAttendanceDuration(502 * 60 + 1)).toBe('08:23')
    expect(formatAttendanceDuration(3599)).toBe('01:00')
    expect(formatAttendanceDuration(0)).toBe('00:00')
    expect(formatAttendanceDuration(-1)).toBe('00:00')
    expect(formatAttendanceDuration(25 * 3600 + 60)).toBe('25:01')
  })
  it('keeps hours above 24 and clamps negative time', () => {
    expect(formatWorkedTime(90061)).toBe('25:01:01')
    expect(formatWorkedTime(-1)).toBe('00:00:00')
    expect(elapsedSeconds('2026-11-04T07:00:00Z', '2026-11-04T06:00:00Z')).toBe(
      0,
    )
  })
  it('formats explicit company timezone values rather than host local times', () => {
    expect(formatAttendanceTime('2026-11-04T06:00:00Z', 'Asia/Tbilisi')).toBe(
      '10:00',
    )
  })
  it('uses ISO Monday weeks across month and year boundaries', () => {
    expect(startOfWorkWeek('2027-01-01')).toBe('2026-12-28')
    expect(startOfWorkWeek('2026-11-08')).toBe('2026-11-02')
  })
})
