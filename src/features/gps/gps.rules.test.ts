import { expect, it } from 'vitest'
import { formatGpsFixAge, isGpsFixStale } from './gps.rules'

const now = Date.parse('2026-11-21T12:00:00Z')
const ago = (minutes: number) => new Date(now - minutes * 60_000)

it.each([
  [0, 'ახლახან'],
  [5, '5 წუთის წინ'],
  [125, '2 საათის წინ'],
  [3 * 24 * 60, '3 დღის წინ'],
])('describes a fix from %s minutes ago', (minutes, text) => {
  expect(formatGpsFixAge(ago(minutes), now)).toBe(text)
})

it('marks fixes older than thirty minutes as stale', () => {
  expect(isGpsFixStale(ago(30), now)).toBe(false)
  expect(isGpsFixStale(ago(31), now)).toBe(true)
})
