import { beforeEach, expect, it, vi } from 'vitest'
import { verifyClockIntent } from './verify-clock'

const calls = vi.hoisted(() => ({ prepare: vi.fn(), authenticate: vi.fn() }))
vi.mock('./attendance-security.functions', () => ({
  prepareAttendanceClock: calls.prepare,
}))
vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: calls.authenticate,
}))
const intent = {
  kind: 'in' as const,
  data: {
    requestId: '019a4fb0-1234-7000-8000-123456789012',
    expectedLastSessionId: null,
  },
}
beforeEach(() => vi.clearAllMocks())
it('skips the browser prompt only when the server confirms the check is disabled', async () => {
  calls.prepare.mockResolvedValue({
    ok: true,
    value: { options: null, challengeId: null },
  })
  expect(await verifyClockIntent(intent)).toEqual({ intent })
  expect(calls.authenticate).not.toHaveBeenCalled()
})
it('never falls back to an unverified action when the browser prompt is cancelled', async () => {
  calls.prepare.mockResolvedValue({
    ok: true,
    value: {
      options: { challenge: 'challenge' },
      challengeId: intent.data.requestId,
    },
  })
  calls.authenticate.mockRejectedValue(
    new DOMException('Cancelled', 'NotAllowedError'),
  )
  await expect(verifyClockIntent(intent)).rejects.toThrow(
    'დადასტურება ვერ დასრულდა.',
  )
})
it('preserves a server restriction without opening a passkey prompt', async () => {
  calls.prepare.mockResolvedValue({
    ok: false,
    message: 'მოწყობილობა დასადასტურებელია.',
  })
  await expect(verifyClockIntent(intent)).rejects.toThrow(
    'მოწყობილობა დასადასტურებელია.',
  )
  expect(calls.authenticate).not.toHaveBeenCalled()
})
