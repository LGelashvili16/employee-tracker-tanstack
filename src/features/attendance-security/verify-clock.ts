import { prepareAttendanceClock } from './attendance-security.functions'
import { clockProofSchema } from './attendance-security.schemas'
import type { clockIntentSchema } from './attendance-security.schemas'
import type { z } from 'zod'

export class ClockVerificationError extends Error {}
export async function verifyClockIntent(
  intent: z.infer<typeof clockIntentSchema>,
) {
  const prepared = await prepareAttendanceClock({ data: intent })
  if (!prepared.ok) throw new ClockVerificationError(prepared.message)
  if (!prepared.value.options || !prepared.value.challengeId)
    return clockProofSchema.parse({ intent })
  try {
    const { startAuthentication } = await import('@simplewebauthn/browser')
    const response = await startAuthentication({
      optionsJSON: prepared.value.options,
    })
    return clockProofSchema.parse({
      intent,
      challengeId: prepared.value.challengeId,
      response,
    })
  } catch {
    throw new ClockVerificationError(
      'დადასტურება ვერ დასრულდა. სცადეთ ხელახლა ან დაუკავშირდით HR-ს.',
    )
  }
}
