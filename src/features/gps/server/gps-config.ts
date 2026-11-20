import { z } from 'zod'
import { protocolIds } from './protocols/protocol.ts'

const integer = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback)
export const gpsConfigSchema = z
  .object({
    GPS_PORT: integer(5505, 1, 65535),
    GPS_PROTOCOL: z.enum(['auto', 'raw', ...protocolIds]).default('auto'),
    GPS_REPLY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    GPS_DEVICE_IDS: z
      .string()
      .default('')
      .transform((value) =>
        value ? value.split(',').map((id) => id.trim()) : [],
      )
      .pipe(
        z
          .array(
            z
              .string()
              .regex(/^\d{5,20}$/, 'მოწყობილობის იდენტიფიკატორი არასწორია'),
          )
          .max(100),
      ),
    GPS_AUTH_SECRET: z.string().max(256).default(''),
    GPS_UTC_OFFSET_MINUTES: integer(0, -720, 840),
    GPS_DATA_DIR: z.string().min(1).default('./.gps-data'),
    GPS_JOURNAL_BYTES: integer(10_485_760, 262_144, 104_857_600),
    GPS_JOURNAL_FILES: integer(5, 2, 20),
    GPS_MAX_CONNECTIONS: integer(32, 1, 128),
    GPS_IDLE_SECONDS: integer(120, 5, 600),
  })
  .superRefine((config, ctx) => {
    if (
      config.GPS_REPLY &&
      (!config.GPS_DEVICE_IDS.length || config.GPS_AUTH_SECRET.length < 32)
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'პასუხებისთვის მიუთითეთ მოწყობილობის იდენტიფიკატორი და მინიმუმ 32 სიმბოლოიანი საიდუმლო',
        path: ['GPS_REPLY'],
      })
    }
  })
export type GpsConfig = z.infer<typeof gpsConfigSchema>

export function readGpsConfig(env: NodeJS.ProcessEnv): GpsConfig {
  const result = gpsConfigSchema.safeParse(env)
  if (!result.success) {
    // Never echo environment values, especially the authentication secret.
    throw new Error(
      `GPS კონფიგურაცია არასწორია: ${result.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    )
  }
  return result.data
}
