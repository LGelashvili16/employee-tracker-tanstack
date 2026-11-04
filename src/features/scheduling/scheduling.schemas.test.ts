import { describe, expect, it } from 'vitest'
import {
  companyScheduleSchema,
  saveCompanyScheduleSchema,
} from './scheduling.schemas'
import type { CompanyScheduleInput } from './scheduling.schemas'

function schedule(): CompanyScheduleInput {
  return {
    effectiveFrom: '2026-11-04',
    timezone: 'Asia/Tbilisi',
    lateGraceMinutes: 5,
    earlyDepartureGraceMinutes: 0,
    days: Array.from({ length: 7 }, (_, index) => ({
      weekday: index + 1,
      hours: index < 5 ? { start: '09:00', end: '18:00' } : null,
    })),
  }
}

describe('company work schedule validation', () => {
  it('accepts a complete week with explicit days off and a five-minute reminder', () => {
    const parsed = companyScheduleSchema.parse(schedule())
    expect(parsed.reminderMinutesBefore).toBe(5)
    expect(parsed.days.filter((day) => day.hours === null)).toHaveLength(2)
  })

  it.each(['UTC', 'America/New_York', 'Europe/Berlin'])(
    'accepts the named timezone %s without assuming Georgian language determines it',
    (timezone) => {
      expect(
        companyScheduleSchema.safeParse({ ...schedule(), timezone }).success,
      ).toBe(true)
    },
  )

  it.each(['Mars/Base', '+04:00', '', 'Asia/Tbilisi '])(
    'rejects invalid timezone %s',
    (timezone) => {
      expect(
        companyScheduleSchema.safeParse({ ...schedule(), timezone }).success,
      ).toBe(false)
    },
  )

  it.each(['2026-02-30', '2026-11-04T00:00:00Z', '04/11/2026'])(
    'rejects invalid or non-date-only effective date %s',
    (effectiveFrom) => {
      expect(
        companyScheduleSchema.safeParse({ ...schedule(), effectiveFrom })
          .success,
      ).toBe(false)
    },
  )

  it('rejects incomplete weeks, repeated weekdays, and entirely nonworking weeks', () => {
    const input = schedule()
    expect(
      companyScheduleSchema.safeParse({
        ...input,
        days: input.days.slice(0, 6),
      }).success,
    ).toBe(false)
    expect(
      companyScheduleSchema.safeParse({
        ...input,
        days: input.days.map((day) => ({ ...day, weekday: 1 })),
      }).success,
    ).toBe(false)
    expect(
      companyScheduleSchema.safeParse({
        ...input,
        days: input.days.map((day) => ({ ...day, hours: null })),
      }).success,
    ).toBe(false)
  })

  it.each([
    { start: '18:00', end: '09:00' },
    { start: '09:00', end: '09:00' },
    { start: '9:00', end: '18:00' },
    { start: '09:00', end: '24:00' },
    { start: '09:60', end: '18:00' },
    { start: '09:00:01', end: '18:00' },
    { start: '09:00', end: null },
  ])(
    'rejects invalid, zero-duration, partial, and overnight hours %j',
    (hours) => {
      const input = schedule()
      expect(
        companyScheduleSchema.safeParse({
          ...input,
          days: input.days.map((day) => ({ ...day, hours })),
        }).success,
      ).toBe(false)
    },
  )

  it.each([
    'lateGraceMinutes',
    'earlyDepartureGraceMinutes',
    'reminderMinutesBefore',
    'checkoutReminderMinutesBefore',
  ] as const)(
    'bounds %s to whole minutes without silently coercing input',
    (field) => {
      for (const value of [-1, 61, 1.5, '5', null]) {
        expect(
          companyScheduleSchema.safeParse({ ...schedule(), [field]: value })
            .success,
        ).toBe(false)
      }
      for (const value of [0, 60]) {
        expect(
          companyScheduleSchema.safeParse({ ...schedule(), [field]: value })
            .success,
        ).toBe(true)
      }
    },
  )

  it('keeps invalid schedule field messages Georgian', () => {
    const result = companyScheduleSchema.safeParse({
      effectiveFrom: 'invalid',
      timezone: null,
      lateGraceMinutes: '5',
      earlyDepartureGraceMinutes: -1,
      reminderMinutesBefore: 100,
      days: [{ weekday: 9, hours: { start: '25:00', end: '01:00' } }],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      for (const issue of result.error.issues)
        expect(issue.message).toMatch(/[ა-ჰ]/)
    }
  })
  it('requires zero grace in new schedules while retaining historical schedule contracts', () => {
    expect(companyScheduleSchema.safeParse(schedule()).success).toBe(true)
    expect(saveCompanyScheduleSchema.safeParse(schedule()).success).toBe(false)
    const parsed = saveCompanyScheduleSchema.parse({
      ...schedule(),
      lateGraceMinutes: 0,
    })
    expect(parsed.checkoutReminderMinutesBefore).toBe(0)
    expect(parsed.reminderMinutesBefore).toBe(5)
    expect(
      saveCompanyScheduleSchema.safeParse({
        ...schedule(),
        lateGraceMinutes: 0,
        earlyDepartureGraceMinutes: 1,
      }).success,
    ).toBe(false)
  })
})
