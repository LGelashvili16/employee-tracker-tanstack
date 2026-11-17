// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import type { Actor } from '#/lib/authorization/actor'
import { notificationRealtimeHandler as handler } from './notifications-stream.server'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const read = vi.hoisted(() => vi.fn())
vi.mock('./notifications.repository.server', () => ({ liveNotification: read }))
const actor: Actor = {
  id: 'worker',
  name: 'ანა',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
const id = '019b1234-1234-7123-8123-123456789abc'
beforeEach(() => vi.clearAllMocks())
it('never exposes contents to foreign recipients or broadcast signals', async () => {
  expect(
    await handler.changed(actor, {
      topic: 'notifications',
      recipientId: 'other',
      subjectId: id,
    }),
  ).toBeNull()
  expect(
    await handler.changed(actor, { topic: 'notifications', subjectId: id }),
  ).toBeNull()
  expect(read).not.toHaveBeenCalled()
})
it('snapshots and read synchronization contain no replayable notification', async () => {
  expect(await handler.snapshot(actor)).toEqual({
    event: 'notifications',
    data: { recipientId: 'worker', changed: false },
  })
  expect(
    await handler.changed(actor, {
      topic: 'notifications',
      recipientId: actor.id,
    }),
  ).toEqual({
    event: 'notifications',
    data: { recipientId: 'worker', changed: true },
  })
  expect(read).not.toHaveBeenCalled()
})
it('looks up only the current recipient and omits notifications no longer eligible', async () => {
  read.mockResolvedValueOnce(undefined)
  expect(
    await handler.changed(actor, {
      topic: 'notifications',
      recipientId: actor.id,
      subjectId: id,
    }),
  ).toEqual({
    event: 'notifications',
    data: { recipientId: 'worker', changed: true },
  })
  expect(read).toHaveBeenCalledWith(actor.id, id)
})
