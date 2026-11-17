import { expect, it } from 'vitest'
import {
  availableVacationDays,
  chargeableVacationDays,
  georgianPublicHolidays,
} from './vacation-allowance.rules'

it('credits each elapsed January once without discarding unused vacation', () => {
  const balance = {
    vacationAnnualDays: 24,
    vacationRemainingDays: 3,
    vacationPeriodYear: 2026,
  }
  expect(availableVacationDays(balance, 2026)).toBe(3)
  expect(availableVacationDays(balance, 2027)).toBe(27)
  expect(availableVacationDays(balance, 2028)).toBe(51)
})
it('excludes Georgian fixed and movable statutory holidays from scheduled working dates', () => {
  for (const date of [
    '2026-04-10',
    '2026-04-11',
    '2026-04-12',
    '2026-04-13',
    '2026-05-17',
  ])
    expect(georgianPublicHolidays(2026).has(date)).toBe(true)
  expect(georgianPublicHolidays(2027).has('2027-05-02')).toBe(true)
  expect(
    chargeableVacationDays([
      { date: '2026-11-20', working: true },
      { date: '2026-11-21', working: false },
      { date: '2026-11-23', working: true },
      { date: '2026-11-24', working: true },
    ]),
  ).toBe(2)
})
