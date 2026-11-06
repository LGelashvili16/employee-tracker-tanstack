import { z } from 'zod'

export const locationSearchSchema = z.object({
  q: z
    .string({ error: 'მიუთითეთ ქუჩა ან მისამართი.' })
    .trim()
    .min(3, 'ძიებისთვის შეიყვანეთ მინიმუმ 3 სიმბოლო.')
    .max(160, 'საძიებო ტექსტი ძალიან გრძელია.'),
})
export const locationFeatureSchema = z.object({
  sourceId: z.string().max(80),
  longitude: z.number().finite().min(-180).max(180),
  latitude: z.number().finite().min(-85).max(85),
  name: z.string().max(300),
  street: z.string().max(300),
  city: z.string().max(300),
  houseNumber: z.string().max(40),
  countryCode: z.string().length(2),
  isStreet: z.boolean(),
})
export const locationFeaturesSchema = z.array(locationFeatureSchema).max(10)
export const resolvedLocationSchema = z.object({
  sourceId: z.string().max(80),
  longitude: z.number().finite(),
  latitude: z.number().finite(),
  labelKa: z.string().max(300).nullable(),
  labelEn: z.string().max(300).nullable(),
  streetNameKa: z.string().max(300).nullable(),
  streetNameEn: z.string().max(300).nullable(),
})
