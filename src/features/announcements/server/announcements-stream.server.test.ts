// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { announcementEventsResponse } from './announcements-stream.server'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  stream: vi.fn(),
  state: vi.fn(),
}))
vi.mock('#/lib/auth/session.server', () => ({
  readActorFromHeaders: mocks.actor,
}))
vi.mock('#/lib/realtime/event-stream.server', () => ({
  eventStreamResponse: mocks.stream,
}))
vi.mock('./announcements.service.server', () => ({
  announcementRealtimeState: mocks.state,
}))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.actor.mockResolvedValue({ id: 'worker' })
  mocks.stream.mockReturnValue(new Response('stream'))
  mocks.state.mockResolvedValue({ unreadCount: 1 })
})
it('rejects anonymous, cross-origin, and client-selected identities before opening a stream', async () => {
  mocks.actor.mockResolvedValue(null)
  expect(
    (
      await announcementEventsResponse(
        new Request('http://localhost/api/events'),
      )
    ).status,
  ).toBe(401)
  expect(
    (
      await announcementEventsResponse(
        new Request('http://localhost/api/events', {
          headers: { Origin: 'https://untrusted.invalid' },
        }),
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await announcementEventsResponse(
        new Request('http://localhost/api/events?userId=other'),
      )
    ).status,
  ).toBe(400)
  expect(mocks.stream).not.toHaveBeenCalled()
})
it('derives the recipient from the session and ignores another employee acknowledgement', async () => {
  await announcementEventsResponse(new Request('http://localhost/api/events'))
  const options = mocks.stream.mock.calls[0][1]
  expect(
    options.accepts({ topic: 'announcements', recipientId: 'someone-else' }),
  ).toBe(false)
  expect(
    options.accepts({ topic: 'announcements', recipientId: 'worker' }),
  ).toBe(true)
  expect(
    await options.changed({
      topic: 'announcements',
      recipientId: 'someone-else',
    }),
  ).toBeNull()
  expect(mocks.state).not.toHaveBeenCalled()
  expect(await options.snapshot()).toEqual({
    event: 'announcements',
    data: { unreadCount: 1 },
  })
  expect(mocks.state).toHaveBeenCalledWith({ id: 'worker' })
  mocks.actor.mockResolvedValue(null)
  expect(await options.authorized()).toBe(false)
})
