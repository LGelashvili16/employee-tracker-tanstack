/**
 * One-time setup codes are read aloud or typed by hand, so the alphabet drops
 * look-alike characters (I, O, 0, 1). 32 symbols over 12 positions give 60 bits,
 * which is ample for a single-use, hashed, rate-limited, short-lived code.
 */
export const setupCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const setupCodeLength = 12
const setupCodeGroupSize = 4

/** Better Auth requires an email-shaped identifier, so accounts without email get one under this reserved, undeliverable domain. */
export const syntheticAuthEmailSuffix = '@accounts.teamwork.invalid'
export const isSyntheticAuthEmail = (email: string) =>
  email.endsWith(syntheticAuthEmailSuffix)

/** Length is the only password rule: no forced character mixes, which push people toward predictable patterns. */
export const minPasswordLength = 8
export const maxPasswordLength = 128

/** Activation is a first-day handover, so it lasts longer than an emergency password reset. */
export const setupCodeLifetimeMinutes = {
  activation: 24 * 60,
  reset: 15,
} as const

/** Accepts the grouped display form (XXXX-XXXX-XXXX), spaces, and lowercase input. */
export function normalizeSetupCode(input: string) {
  return input.replace(/[\s-]/g, '').toUpperCase()
}

export function formatSetupCode(code: string) {
  const groups = code.match(new RegExp(`.{1,${setupCodeGroupSize}}`, 'g'))
  return groups ? groups.join('-') : code
}
