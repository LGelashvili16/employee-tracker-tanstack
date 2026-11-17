import { describe, expect, it } from 'vitest'
import { accountCodeSchema } from './access.schemas'
import { formatSetupCode, normalizeSetupCode } from './access.rules'

describe('setup codes', () => {
  it('groups a code for display and reads it back unchanged', () => {
    const grouped = formatSetupCode('ABCDEFGH2345')
    expect(grouped).toBe('ABCD-EFGH-2345')
    expect(normalizeSetupCode(grouped)).toBe('ABCDEFGH2345')
  })

  it('accepts typed variations of a valid code', () => {
    expect(accountCodeSchema.parse(' abcd-efgh 2345 ')).toBe('ABCDEFGH2345')
  })

  it.each(['ABCDEFGH234', 'ABCDEFGH23456', 'ABCDEFGH234O', 'ABCDEFGH2341'])(
    'rejects %s',
    (code) => {
      expect(accountCodeSchema.safeParse(code).success).toBe(false)
    },
  )
})
