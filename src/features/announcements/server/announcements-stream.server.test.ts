// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { announcementRealtimeHandler } from './announcements-stream.server'
import type { Actor } from '#/lib/authorization/actor'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const state = vi.hoisted(() => vi.fn())
vi.mock('./announcements.service.server', () => ({
  announcementRealtimeState: state,
}))
const actor: Actor = {
  id: 'worker',
  name: 'ტესტი',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
beforeEach(() => {
  vi.clearAllMocks()
  state.mockResolvedValue({ unreadCount: 1 })
})
it('projects authorized snapshots without historical publication alerts', async () => {
  expect(await announcementRealtimeHandler.snapshot(actor)).toEqual({
    event: 'announcements',
    data: { unreadCount: 1 },
  })
  expect(state).toHaveBeenCalledWith(actor)
})
it('ignores another recipient and delegates live publication access to the service', async () => {
  expect(
    await announcementRealtimeHandler.changed(actor, {
      topic: 'announcements',
      recipientId: 'other',
    }),
  ).toBeNull()
  expect(state).not.toHaveBeenCalled()
  const subjectId = '019aac01-0000-7000-8000-000000000001'
  expect(
    await announcementRealtimeHandler.changed(actor, {
      topic: 'announcements',
      subjectId,
    }),
  ).toMatchObject({ event: 'announcements', id: subjectId })
  expect(state).toHaveBeenCalledWith(actor, subjectId)
})
