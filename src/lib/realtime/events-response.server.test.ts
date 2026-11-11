// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { eventsResponse } from './events-response.server'
import { announcementRealtimeHandler } from '#/features/announcements/server/announcements-stream.server'
import type { RealtimeHandler } from './events-response.server'

const announcementEventsResponse = (request: Request) =>
  eventsResponse(request, [announcementRealtimeHandler])

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
vi.mock('#/features/announcements/server/announcements.service.server', () => ({
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
  expect(await options.snapshot()).toEqual([
    {
      event: 'announcements',
      data: { unreadCount: 1 },
    },
  ])
  expect(mocks.state).toHaveBeenCalledWith({ id: 'worker' })
  mocks.actor.mockResolvedValue(null)
  expect(await options.authorized()).toBe(false)
})

it('composes snapshots, dispatches matching topics, and passes refreshed authorization to features', async () => {
  const first: RealtimeHandler = {
    topic: 'announcements',
    snapshot: vi
      .fn()
      .mockResolvedValue({ event: 'announcements', data: { unreadCount: 2 } }),
    changed: vi.fn().mockResolvedValue(null),
  }
  const second: RealtimeHandler = {
    topic: 'announcements',
    snapshot: vi.fn().mockResolvedValue(null),
    changed: vi
      .fn()
      .mockResolvedValue({ event: 'announcements', data: { unreadCount: 0 } }),
  }
  await eventsResponse(new Request('http://localhost/api/events'), [
    first,
    second,
  ])
  const options = mocks.stream.mock.calls[0][1]
  const updated = { id: 'worker', roles: ['employee'] }
  mocks.actor.mockResolvedValue(updated)
  expect(await options.authorized()).toBe(true)
  expect(await options.snapshot()).toEqual([
    { event: 'announcements', data: { unreadCount: 2 } },
  ])
  expect(first.snapshot).toHaveBeenCalledWith(updated)
  expect(second.snapshot).toHaveBeenCalledWith(updated)
  expect(options.accepts({ topic: 'unregistered' })).toBe(false)
  expect(await options.changed({ topic: 'unregistered' })).toBeNull()
  expect(first.changed).not.toHaveBeenCalled()
  const signal = { topic: 'announcements', recipientId: 'worker' }
  expect(await options.changed(signal)).toEqual([
    { event: 'announcements', data: { unreadCount: 0 } },
  ])
  expect(first.changed).toHaveBeenCalledWith(updated, signal)
  expect(second.changed).toHaveBeenCalledWith(updated, signal)
  mocks.actor.mockResolvedValue({ id: 'another-account' })
  expect(await options.authorized()).toBe(false)
})
