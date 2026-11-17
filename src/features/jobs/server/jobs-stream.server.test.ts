// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import type { Actor } from '#/lib/authorization/actor'
import { jobsRealtimeHandler } from './jobs-stream.server'

const mocks = vi.hoisted(() => ({ authorize: vi.fn() }))
vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('./jobs.repository.server', () => ({
  transactJobs: (callback: (tx: unknown) => unknown) => callback({}),
}))
vi.mock('./jobs.policy.server', () => ({ requireJobActor: mocks.authorize }))
const actor: Actor = {
  id: 'worker',
  name: 'ტესტი',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
beforeEach(() => vi.clearAllMocks())
it('rechecks workspace access for snapshots and changes and reveals no job content', async () => {
  expect(await jobsRealtimeHandler.snapshot(actor)).toEqual({
    event: 'jobs',
    data: { recipientId: actor.id, changed: false },
  })
  expect(
    await jobsRealtimeHandler.changed(actor, {
      topic: 'jobs',
      subjectId: '019aac01-0000-7000-8000-000000000001',
    }),
  ).toEqual({ event: 'jobs', data: { recipientId: actor.id, changed: true } })
  expect(mocks.authorize).toHaveBeenCalledTimes(2)
})
it('drops events for currently unauthorized accounts without disrupting other topics', async () => {
  mocks.authorize.mockRejectedValueOnce(new AuthorizationError())
  expect(await jobsRealtimeHandler.snapshot(actor)).toBeNull()
  mocks.authorize.mockRejectedValueOnce(new AuthorizationError())
  expect(await jobsRealtimeHandler.changed(actor, { topic: 'jobs' })).toBeNull()
})

it('ignores recipient-targeted signals for another account', async () => {
  expect(
    await jobsRealtimeHandler.changed(actor, {
      topic: 'jobs',
      recipientId: 'other',
    }),
  ).toBeNull()
  expect(mocks.authorize).not.toHaveBeenCalled()
})
