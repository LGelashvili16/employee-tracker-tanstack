import { describe, expect, it } from 'vitest'
import { authLinkSearchSchema, recordIdSchema } from './route-schemas'
import { loginSchema } from '#/features/auth/auth.schemas'

describe('untrusted route and form inputs', () => {
  it('accepts opaque record IDs but rejects traversal and oversized input', () => {
    expect(recordIdSchema.safeParse('employee_abc-123').success).toBe(true)
    for (const id of ['', '../secret', 'a/b', 'a'.repeat(129)])
      expect(recordIdSchema.safeParse(id).success).toBe(false)
  })
  it('rejects malformed auth links and invalid login values', () => {
    expect(
      authLinkSearchSchema.safeParse({ token: ['unexpected'] }).success,
    ).toBe(false)
    expect(
      authLinkSearchSchema.safeParse({ token: 'a'.repeat(513) }).success,
    ).toBe(false)
    const result = loginSchema.safeParse({ email: 'invalid', password: '' })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(
        result.error.issues.every((issue) => /[ა-ჰ]/.test(issue.message)),
      ).toBe(true)
  })
})
