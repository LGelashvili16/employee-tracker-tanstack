import { z } from 'zod'
import { APP_NAME } from '#/lib/app'

const metadataSchema = z.object({
  status: z.number().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
})

export function errorStatus(error: unknown) {
  const result = metadataSchema.safeParse(error)
  if (!result.success) return 500
  const { status, code, name } = result.data
  if (code === 'FORBIDDEN' || name === 'AuthorizationError') return 403
  switch (status) {
    case 401:
    case 403:
    case 404:
    case 429:
    case 503:
      return status
    default:
      return 500
  }
}

/** Never log the original error: provider messages and stacks can contain private data. */
export function reportError(
  source: 'route' | 'network-access' | 'database-pool',
  error: unknown,
  status = errorStatus(error),
) {
  const reference = crypto.randomUUID()
  const timestamp = new Date().toISOString()
  const parsed = metadataSchema.safeParse(error)
  const code = parsed.success ? parsed.data.code : undefined
  const diagnostic =
    code &&
    [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      '53300',
      '57P01',
      '08006',
    ].includes(code)
      ? code
      : parsed.success && parsed.data.name === 'ZodError'
        ? 'INVALID_CONFIGURATION_OR_INPUT'
        : 'UNCLASSIFIED'
  console.error(`[${APP_NAME}]`, {
    source,
    reference,
    timestamp,
    status,
    diagnostic,
  })
  return { reference, timestamp }
}
