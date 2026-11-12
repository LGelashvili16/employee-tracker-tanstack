import { describe, expect, it } from 'vitest'
import {
  elapsedSeconds,
  formatAttendanceDuration,
  formatAttendanceDateTime,
  formatAttendanceTime,
  formatWorkedTime,
  startOfWorkWeek,
  attendanceWeek,
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
    expect(
      formatAttendanceDateTime('2026-11-12T07:18:00Z', 'Asia/Tbilisi'),
    ).toBe('12 ნოემბერი, 2026, 11:18')
    expect(
      formatAttendanceDateTime('2026-12-31T22:05:00Z', 'Asia/Tbilisi'),
    ).toBe('1 იანვარი, 2027, 02:05')
  })
  it('uses ISO Monday weeks across month and year boundaries', () => {
    expect(startOfWorkWeek('2027-01-01')).toBe('2026-12-28')
    expect(startOfWorkWeek('2026-11-08')).toBe('2026-11-02')
  })
})

it('returns complete Monday to Sunday weeks across month and year boundaries', () => {
  expect(attendanceWeek('2026-11-12')).toEqual({
    start: '2026-11-09',
    end: '2026-11-15',
  })
  expect(attendanceWeek('2026-11-15')).toEqual({
    start: '2026-11-09',
    end: '2026-11-15',
  })
  expect(attendanceWeek('2027-01-01')).toEqual({
    start: '2026-12-28',
    end: '2027-01-03',
  })
})
