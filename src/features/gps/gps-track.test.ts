import { expect, it } from 'vitest'
import { gpsHistoryRange } from './gps.schemas'
import { buildGpsTrack } from './gps-track'

it('accepts up to seven inclusive calendar days', () => {
  expect(
    gpsHistoryRange.safeParse({ from: '2026-11-27', to: '2026-12-03' }).success,
  ).toBe(true)
  expect(
    gpsHistoryRange.safeParse({ from: '2026-11-27', to: '2026-12-04' }).success,
  ).toBe(false)
  expect(
    gpsHistoryRange.safeParse({ from: '2026-11-27', to: '2026-11-26' }).success,
  ).toBe(false)
})

it('does not draw a continuous track through invalid fixes or long gaps', () => {
  const fix = (minute: number, longitude: number, valid = true) => ({
    fixAt: new Date(minute * 60_000),
    longitude,
    latitude: 41,
    valid,
  })
  expect(
    buildGpsTrack([
      fix(0, 44),
      fix(5, 45),
      fix(6, 0, false),
      fix(7, 46),
      fix(13, 47),
    ]),
  ).toEqual([
    [
      [44, 41],
      [45, 41],
    ],
    [[46, 41]],
    [[47, 41]],
  ])
})
