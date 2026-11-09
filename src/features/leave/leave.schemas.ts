import { z } from 'zod'

export const leaveKindSchema = z.enum(['day_off', 'vacation', 'sick_leave'], {
  error: 'აირჩიეთ მოთხოვნის ტიპი.',
})
export const leaveStatusSchema = z.enum(
  ['pending', 'approved', 'rejected', 'cancelled'],
  {
    error: 'აირჩიეთ მოთხოვნის სტატუსი.',
  },
)
const date = z.iso
  .date({ error: 'მიუთითეთ სწორი თარიღი.' })
  .pipe(
    z
      .string()
      .refine(
        (value) => value >= '2000-01-01' && value <= '2100-12-31',
        'თარიღი უნდა იყოს 2000 წლიდან 2100 წლამდე.',
      ),
  )
const endDate = date
  .or(z.literal(''))
  .nullable()
  .transform((value) => value || null)
const dates = { startDate: date, endDate }
export const singleDayError = 'დასვენების დღისთვის აირჩიეთ მხოლოდ ერთი თარიღი.'
export function hasValidDayOffDates(value: {
  kind: string
  startDate: string
  endDate: string | null
}) {
  return value.kind !== 'day_off' || value.startDate === value.endDate
}
const validRange = (value: {
  startDate: string
  endDate: string | null
  kind?: string
}) =>
  !date.safeParse(value.startDate).success ||
  value.endDate === null ||
  !date.safeParse(value.endDate).success ||
  (value.endDate >= value.startDate &&
    (value.kind === 'sick_leave' ||
      Date.parse(value.endDate) - Date.parse(value.startDate) <=
        365 * 86400000))
const rangeError = {
  message:
    'დასრულება უნდა იყოს დაწყების შემდეგ ან იმავე დღეს; პერიოდი არ უნდა აღემატებოდეს 366 დღეს.',
  path: ['endDate'],
}
export const createLeaveSchema = z
  .object(
    {
      kind: leaveKindSchema,
      ...dates,
      note: z
        .string({ error: 'მიუთითეთ ტექსტი.' })
        .trim()
        .max(500, 'მაქსიმუმ 500 სიმბოლო.'),
    },
    { error: 'მოთხოვნის მონაცემები არასწორია.' },
  )
  .refine(validRange, rangeError)
  .refine(hasValidDayOffDates, { message: singleDayError, path: ['endDate'] })
  .refine((value) => value.kind === 'sick_leave' || value.endDate !== null, {
    message: 'მიუთითეთ დასრულების თარიღი.',
    path: ['endDate'],
  })
const reviewDescriptionSchema = z
  .string({ error: 'აღწერა უნდა იყოს ტექსტი.' })
  .trim()
  .max(500, 'მაქსიმუმ 500 სიმბოლო.')
export const reviewLeaveSchema = z
  .object(
    {
      id: z.uuidv7({ error: 'მოთხოვნის იდენტიფიკატორი არასწორია.' }),
      revision: z
        .number({ error: 'განაახლეთ მოთხოვნა.' })
        .int('ვერსია არასწორია.')
        .min(0, 'ვერსია არასწორია.'),
      action: z.enum(['modified', 'approved', 'rejected'], {
        error: 'აირჩიეთ მოქმედება.',
      }),
      ...dates,
      reason: reviewDescriptionSchema.default(''),
    },
    { error: 'განხილვის მონაცემები არასწორია.' },
  )
  .refine(
    (value) => value.endDate === null || value.endDate >= value.startDate,
    rangeError,
  )
export const reviewLeaveFormSchema = reviewLeaveSchema.safeExtend({
  reason: reviewDescriptionSchema,
})
export const cancelLeaveSchema = z.object(
  {
    id: reviewLeaveSchema.shape.id,
    revision: reviewLeaveSchema.shape.revision,
  },
  { error: 'გაუქმების მონაცემები არასწორია.' },
)
export const leaveSearchSchema = z.object(
  {
    page: z
      .number({ error: 'გვერდი არასწორია.' })
      .int('გვერდი არასწორია.')
      .min(1, 'გვერდი არასწორია.')
      .max(100000, 'გვერდი არასწორია.')
      .optional(),
    q: z
      .string({ error: 'ძიება არასწორია.' })
      .trim()
      .max(100, 'მაქსიმუმ 100 სიმბოლო.')
      .optional(),
    status: z
      .enum(['all', ...leaveStatusSchema.options], {
        error: 'სტატუსი არასწორია.',
      })
      .optional(),
    sort: z
      .enum(['newest', 'oldest', 'date-asc', 'date-desc'], {
        error: 'დალაგება არასწორია.',
      })
      .optional(),
  },
  { error: 'ძიების მონაცემები არასწორია.' },
)
export type LeaveSearch = z.infer<typeof leaveSearchSchema>
export const leaveFilterSchema = leaveSearchSchema
  .omit({ page: true })
  .required()
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>

export const closeSickLeaveSchema = z.object(
  {
    id: reviewLeaveSchema.shape.id,
    revision: reviewLeaveSchema.shape.revision,
    endDate: date,
  },
  { error: 'ბიულეტენის დახურვის მონაცემები არასწორია.' },
)
export function hasValidLeaveRange(value: {
  kind: string
  startDate: string
  endDate: string | null
}) {
  return validRange(value)
}
