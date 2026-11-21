import { z } from 'zod'

export const gpsPageSize = 20
export const gpsSearchText = z
  .string()
  .trim()
  .max(80, 'ძიება უნდა შეიცავდეს მაქსიმუმ 80 სიმბოლოს.')
export const gpsMapLimit = 200
export const gpsSearchSchema = z.object({
  q: gpsSearchText.catch('').default(''),
})
export type GpsSearch = z.output<typeof gpsSearchSchema>
export const gpsMapSchema = gpsSearchSchema.extend({
  includeDisabled: z.boolean().default(false),
})

export const gpsDeviceParams = z.object({
  deviceId: z.uuid({ error: 'მოწყობილობის იდენტიფიკატორი არასწორია.' }),
})
export const gpsTimeZone = 'Asia/Tbilisi'
const historyDay = z.iso
  .date({ error: 'აირჩიეთ თარიღი.' })
  .refine((day) => day >= '0001-01-01', 'აირჩიეთ სწორი თარიღი.')
export const gpsHistoryRange = z
  .object({ from: historyDay, to: historyDay })
  .refine(
    ({ from, to }) => {
      const span = Date.parse(to) - Date.parse(from)
      return span >= 0 && span < 7 * 86_400_000
    },
    { path: ['to'], error: 'აირჩიეთ პერიოდი ერთიდან შვიდ დღემდე.' },
  )
const historyPage = z.number().int().min(1)
export const gpsHistoryInput = gpsHistoryRange.safeExtend({
  ...gpsDeviceParams.shape,
  page: historyPage,
})
export const gpsHistorySearch = z
  .object({
    from: z.unknown().optional(),
    to: z.unknown().optional(),
    page: historyPage.catch(1).default(1),
  })
  .transform(({ page, ...dates }) => {
    const range = gpsHistoryRange.safeParse(dates)
    if (range.success) return { ...range.data, page }
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: gpsTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    return { from: today, to: today, page: 1 }
  })
export type GpsHistorySearch = z.output<typeof gpsHistorySearch>

export const gpsDeviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'მიუთითეთ მოწყობილობის სახელი.')
    .max(100, 'სახელი უნდა შეიცავდეს მაქსიმუმ 100 სიმბოლოს.'),
  reportedId: z
    .string()
    .trim()
    .regex(
      /^(?=[0-9]*[1-9])[0-9]{5,20}$/,
      'მიუთითეთ მოწყობილობის 5-დან 20-მდე ციფრიანი იდენტიფიკატორი.',
    ),
  enabled: z.boolean({ error: 'მიუთითეთ მოწყობილობის სტატუსი.' }),
})
export const gpsSaveSchema = z.union(
  [
    gpsDeviceSchema.extend({ id: z.null(), version: z.null() }),
    gpsDeviceSchema.extend({
      id: z.uuid({ error: 'მოწყობილობა არასწორია.' }),
      version: z
        .number()
        .int()
        .positive({ error: 'მოწყობილობის ვერსია არასწორია.' }),
    }),
  ],
  { error: 'მოწყობილობის მონაცემები არასწორია.' },
)
