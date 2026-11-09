import { z } from 'zod'

export const dayOffDaysSchema = z
  .number({ error: 'მიუთითეთ დღეების რაოდენობა.' })
  .int('მიუთითეთ მთელი დღეები.')
  .min(0, 'დღეების რაოდენობა უარყოფითი ვერ იქნება.')
  .max(366, 'მაქსიმუმ 366 დღე.')
export const paidVacationDaysSchema = dayOffDaysSchema.min(
  24,
  'ანაზღაურებადი შვებულება უნდა იყოს მინიმუმ 24 სამუშაო დღე.',
)
const vacationRemainingSchema = z
  .number({ error: 'მიუთითეთ დარჩენილი სამუშაო დღეები.' })
  .int('მიუთითეთ მთელი დღეები.')
  .min(0, 'ბალანსი უარყოფითი ვერ იქნება.')
  .max(100000, 'ბალანსი ძალიან დიდია.')
const revision = z
  .number({ error: 'განაახლეთ მონაცემები.' })
  .int('ვერსია არასწორია.')
  .min(0, 'ვერსია არასწორია.')
export const allowanceTargetSchema = z.object(
  {
    userId: z
      .string({ error: 'თანამშრომელი არასწორია.' })
      .min(1, 'აირჩიეთ თანამშრომელი.')
      .max(128, 'თანამშრომელი არასწორია.'),
  },
  { error: 'თანამშრომელი არასწორია.' },
)
const explanation = z
  .string({ error: 'მიუთითეთ ცვლილების მიზეზი.' })
  .trim()
  .min(5, 'მიუთითეთ მინიმუმ 5 სიმბოლო.')
  .max(500, 'მაქსიმუმ 500 სიმბოლო.')
export const saveDayOffSettingSchema = z.object(
  {
    defaultDays: dayOffDaysSchema,
    defaultVacationDays: paidVacationDaysSchema.optional(),
    resetYearly: z.boolean({ error: 'აირჩიეთ წლიური განახლების წესი.' }),
    revision,
    reason: explanation,
  },
  { error: 'დასვენების დღეების წესი არასწორია.' },
)
export const adjustDayOffBalanceSchema = allowanceTargetSchema.extend({
  annualDays: dayOffDaysSchema,
  vacationAnnualDays: paidVacationDaysSchema.optional(),
  vacationRemainingDays: vacationRemainingSchema.optional(),
  remainingDays: z
    .number({ error: 'მიუთითეთ დარჩენილი დღეები.' })
    .int('მიუთითეთ მთელი დღეები.')
    .min(0, 'ბალანსი უარყოფითი ვერ იქნება.')
    .max(3660, 'მაქსიმუმ 3660 დღე.'),
  revision,
  year: z
    .number({ error: 'წელი არასწორია.' })
    .int('წელი არასწორია.')
    .min(2000, 'წელი არასწორია.')
    .max(2100, 'წელი არასწორია.'),
  reason: explanation,
})
export const saveAllowanceSettingFormSchema =
  saveDayOffSettingSchema.safeExtend({
    defaultVacationDays: paidVacationDaysSchema,
  })
export const adjustAllowanceBalanceFormSchema =
  adjustDayOffBalanceSchema.safeExtend({
    vacationAnnualDays: paidVacationDaysSchema,
    vacationRemainingDays: vacationRemainingSchema,
  })
export type DayOffSettingInput = z.infer<typeof saveDayOffSettingSchema>
export type DayOffAdjustmentInput = z.infer<typeof adjustDayOffBalanceSchema>
export type DayOffBalanceView = {
  vacationAnnualDays: number
  vacationRemainingDays: number
  annualDays: number
  remainingDays: number
  revision: number
  year: number
  resetYearly: boolean
}
