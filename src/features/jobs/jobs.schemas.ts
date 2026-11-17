import { z } from 'zod'
import { georgiaLocationError, isLocationInGeorgia } from './jobs.geography'
import { jobsMonthRange } from './jobs.dates'

const jobDateSchema = z.iso
  .date({ error: 'თარიღი არასწორია.' })
  .refine(
    (date) => date >= '1900-01-01' && date <= '2100-12-31',
    'აირჩიეთ თარიღი 1900 და 2100 წლებს შორის.',
  )
export const jobDeadlineSchema = jobDateSchema.nullable()

export const jobStatusSchema = z.enum(
  ['pending', 'en_route', 'on_site', 'completed', 'rejected'],
  { error: 'სამუშაოს სტატუსი არასწორია.' },
)
export const jobKindSchema = z.enum(['installation', 'measurement', 'other'], {
  error: 'სამუშაოს ტიპი არასწორია.',
})
export const jobIdSchema = z.uuid({
  error: 'სამუშაოს იდენტიფიკატორი არასწორია.',
})
const versionSchema = z
  .number({ error: 'ვერსია არასწორია.' })
  .int('ვერსია არასწორია.')
  .min(1, 'ვერსია არასწორია.')
export const jobLocationSchema = z
  .object({
    longitude: z
      .number({ error: 'გრძედი არასწორია.' })
      .min(-180, 'გრძედი არასწორია.')
      .max(180, 'გრძედი არასწორია.'),
    latitude: z
      .number({ error: 'განედი არასწორია.' })
      .min(-85, 'განედი არასწორია.')
      .max(85, 'განედი არასწორია.'),
  })
  .refine(isLocationInGeorgia, {
    path: ['latitude'],
    message: georgiaLocationError,
  })

export const jobFieldsSchema = z
  .object({
    longitude: jobLocationSchema.shape.longitude.nullable().default(null),
    latitude: jobLocationSchema.shape.latitude.nullable().default(null),
    title: z
      .string({ error: 'მიუთითეთ სათაური.' })
      .trim()
      .min(3, 'სათაური უნდა შეიცავდეს მინიმუმ 3 სიმბოლოს.')
      .max(160, 'სათაური ძალიან გრძელია.'),
    notes: z
      .string({ error: 'შენიშვნა არასწორია.' })
      .trim()
      .max(4000, 'შენიშვნა ძალიან გრძელია.'),
    address: z
      .string({ error: 'მისამართი არასწორია.' })
      .trim()
      .max(300, 'მისამართი ძალიან გრძელია.'),
    kind: jobKindSchema,
    deadline: jobDeadlineSchema.default(null),
  })
  .superRefine((value, context) => {
    if ((value.longitude === null) !== (value.latitude === null)) {
      context.addIssue({
        code: 'custom',
        path: [value.longitude === null ? 'longitude' : 'latitude'],
        message: 'მიუთითეთ განედი და გრძედი ერთად.',
      })
    } else if (
      value.longitude !== null &&
      value.latitude !== null &&
      !isLocationInGeorgia({
        longitude: value.longitude,
        latitude: value.latitude,
      })
    ) {
      context.addIssue({
        code: 'custom',
        path: ['latitude'],
        message: georgiaLocationError,
      })
    }
  })
export const jobEditorSchema = jobFieldsSchema
  .safeExtend({
    longitude: jobLocationSchema.shape.longitude.nullable(),
    latitude: jobLocationSchema.shape.latitude.nullable(),
    hasCoordinates: z.boolean({ error: 'მდებარეობის არჩევანი არასწორია.' }),
    deadline: jobDeadlineSchema,
  })
  .superRefine((value, context) => {
    if (!value.hasCoordinates) return
    for (const name of ['latitude', 'longitude'] as const) {
      if (value[name] === null)
        context.addIssue({
          code: 'custom',
          path: [name],
          message:
            name === 'latitude' ? 'მიუთითეთ განედი.' : 'მიუთითეთ გრძედი.',
        })
    }
  })
export const createJobSchema = jobFieldsSchema.safeExtend({
  requestId: z.uuid({ error: 'მოთხოვნა არასწორია.' }),
})
export const editJobSchema = jobFieldsSchema.safeExtend({
  id: jobIdSchema,
  version: versionSchema,
  // An omitted field must never silently clear a deadline saved by a newer client.
  deadline: jobDeadlineSchema,
})
export const jobLookupSchema = z.object({ id: jobIdSchema })
export const jobTransitionSchema = z
  .object({
    id: jobIdSchema,
    version: versionSchema,
    status: jobStatusSchema,
    note: z
      .string({ error: 'შენიშვნა არასწორია.' })
      .trim()
      .max(2000, 'შენიშვნა ძალიან გრძელია.'),
  })
  .superRefine((value, context) => {
    if (
      (value.status === 'rejected' || value.status === 'pending') &&
      value.note.length < 5
    )
      context.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'მიუთითეთ მიზეზი, მინიმუმ 5 სიმბოლო.',
      })
  })

export const jobDateRangeSchema = z
  .object({ from: jobDateSchema, to: jobDateSchema })
  .refine((range) => range.from <= range.to, {
    path: ['to'],
    message: 'დასასრული დასაწყისზე ადრე არ უნდა იყოს.',
  })
export const jobFilterSchema = z
  .object({
    from: jobDateSchema,
    to: jobDateSchema,
    q: z
      .string({ error: 'საძიებო ტექსტი არასწორია.' })
      .trim()
      .max(100, 'საძიებო ტექსტი ძალიან გრძელია.'),
    status: z.enum(['all', ...jobStatusSchema.options], {
      error: 'სტატუსი არასწორია.',
    }),
    kind: z.enum(['all', ...jobKindSchema.options], {
      error: 'ტიპი არასწორია.',
    }),
    scope: z.enum(['all', 'mine'], { error: 'ფილტრი არასწორია.' }),
    sort: z.enum(['newest', 'oldest', 'title'], {
      error: 'დალაგება არასწორია.',
    }),
  })
  .refine((range) => range.from <= range.to, {
    path: ['to'],
    message: 'დასასრული დასაწყისზე ადრე არ უნდა იყოს.',
  })
export const jobSearchSchema = z
  .object({
    from: jobDateSchema.optional(),
    to: jobDateSchema.optional(),
    q: jobFilterSchema.shape.q.default(''),
    status: jobFilterSchema.shape.status.default('all'),
    kind: jobFilterSchema.shape.kind.default('all'),
    scope: jobFilterSchema.shape.scope.default('all'),
    sort: jobFilterSchema.shape.sort.default('newest'),
    page: z.coerce
      .number({ error: 'გვერდი არასწორია.' })
      .int('გვერდი არასწორია.')
      .min(1, 'გვერდი არასწორია.')
      .max(10000, 'გვერდი არასწორია.')
      .default(1),
    view: z.enum(['map', 'list'], { error: 'ხედი არასწორია.' }).default('map'),
    pin: jobIdSchema.optional(),
  })
  .superRefine((range, context) => {
    if ((range.from === undefined) !== (range.to === undefined))
      context.addIssue({
        code: 'custom',
        path: [range.from === undefined ? 'from' : 'to'],
        message: 'მიუთითეთ პერიოდის დასაწყისი და დასასრული.',
      })
    if (range.from && range.to && range.from > range.to)
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'დასასრული დასაწყისზე ადრე არ უნდა იყოს.',
      })
  })
  .transform((value) => ({
    ...value,
    ...(value.from !== undefined && value.to !== undefined
      ? { from: value.from, to: value.to }
      : jobsMonthRange()),
  }))
export const jobMapSearchSchema = z.object({ q: jobFilterSchema.shape.q })
export const jobsPageSize = 12
export const jobsMapLimit = 300

export const jobsRealtimeSchema = z
  .object({ recipientId: z.string().min(1).max(256), changed: z.boolean() })
  .strict()
