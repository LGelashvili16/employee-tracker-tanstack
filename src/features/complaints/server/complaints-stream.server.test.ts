// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { complaintRealtimeHandler } from './complaints-stream.server'
import type { Actor } from '#/lib/authorization/actor'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const state = vi.hoisted(() => vi.fn())
vi.mock('./complaints.service.server', () => ({
  complaintRealtimeState: state,
}))
const actor: Actor = {
  id: 'worker',
  name: 'ტესტი',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
beforeEach(() => vi.clearAllMocks())
it('takes reconnect snapshots without replaying past changes and suppresses unauthorized projections', async () => {
  state
    .mockResolvedValueOnce({ changed: false })
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({
      changed: true,
      id: '019aac01-0000-7000-8000-000000000001',
    })
  expect(await complaintRealtimeHandler.snapshot(actor)).toEqual({
    event: 'complaints',
    data: { changed: false },
  })
  const signal = {
    topic: 'complaints' as const,
    subjectId: '019aac01-0000-7000-8000-000000000001',
  }
  expect(await complaintRealtimeHandler.changed(actor, signal)).toBeNull()
  expect(await complaintRealtimeHandler.changed(actor, signal)).toMatchObject({
    event: 'complaints',
    data: { changed: true, id: signal.subjectId },
  })
  expect(state).toHaveBeenLastCalledWith(actor, signal.subjectId)
})
