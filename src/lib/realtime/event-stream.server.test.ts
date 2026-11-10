// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { eventStreamResponse } from './event-stream.server'
import type { RealtimeSignal } from './realtime.schemas'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const source = vi.hoisted(() => ({
  unsubscribe: vi.fn(),
  signal: (_value: RealtimeSignal) => {},
  connected: () => {},
}))
vi.mock('./postgres-events.server', () => ({
  subscribeRealtime: (subscriber: {
    signal: typeof source.signal
    connected: () => void
  }) => {
    source.signal = subscriber.signal
    source.connected = subscriber.connected
    return source.unsubscribe
  },
}))
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})
const snapshot = () =>
  Promise.resolve({ event: 'announcements', data: { unreadCount: 2 } })
const decoder = new TextDecoder()

it('frames snapshots and live signals, disables caching, and releases subscriptions on abort', async () => {
  const abort = new AbortController()
  const response = eventStreamResponse(
    new Request('http://localhost/api/events', { signal: abort.signal }),
    {
      authorized: async () => true,
      snapshot,
      changed: async (signal) => ({
        event: 'announcements',
        id: signal.subjectId,
        data: { title: 'სიახლე' },
      }),
    },
  )
  expect(response.headers.get('content-type')).toContain('text/event-stream')
  expect(response.headers.get('cache-control')).toContain('no-store')
  const reader = response.body!.getReader()
  expect(decoder.decode((await reader.read()).value)).toContain('retry: 3000')
  expect(decoder.decode((await reader.read()).value)).toContain(
    'data: {"unreadCount":2}\n\n',
  )
  source.signal({
    topic: 'announcements',
    subjectId: '019aac01-0000-7000-8000-000000000001',
  })
  expect(decoder.decode((await reader.read()).value)).toContain(
    'id: 019aac01-0000-7000-8000-000000000001\nevent: announcements',
  )
  abort.abort()
  expect(source.unsubscribe).toHaveBeenCalledOnce()
  expect((await reader.read()).done).toBe(true)
})

it('reconciles state after listener reconnection and closes revoked sessions at heartbeat', async () => {
  vi.useFakeTimers()
  const authorized = vi.fn().mockResolvedValue(true)
  const response = eventStreamResponse(
    new Request('http://localhost/api/events'),
    {
      authorized,
      snapshot,
      changed: async () => null,
    },
  )
  const reader = response.body!.getReader()
  await reader.read()
  await reader.read()
  source.connected()
  expect(decoder.decode((await reader.read()).value)).toContain(
    '"unreadCount":2',
  )
  authorized.mockResolvedValue(false)
  await vi.advanceTimersByTimeAsync(25000)
  expect(decoder.decode((await reader.read()).value)).toContain(
    'event: session-ended',
  )
  expect((await reader.read()).done).toBe(true)
  expect(source.unsubscribe).toHaveBeenCalledOnce()
})

it('cancels a disconnected reader without keeping timers or subscriptions', async () => {
  const response = eventStreamResponse(
    new Request('http://localhost/api/events'),
    {
      authorized: async () => true,
      snapshot,
      changed: async () => null,
    },
  )
  await response.body!.cancel()
  expect(source.unsubscribe).toHaveBeenCalledOnce()
})

it('does not subscribe an already aborted request', async () => {
  const abort = new AbortController()
  abort.abort()
  const response = eventStreamResponse(
    new Request('http://localhost/api/events', { signal: abort.signal }),
    {
      authorized: async () => true,
      snapshot,
      changed: async () => null,
    },
  )
  expect((await response.body!.getReader().read()).done).toBe(true)
  expect(source.unsubscribe).not.toHaveBeenCalled()
})

it('filters another recipient signal before making session or feature queries', async () => {
  const authorized = vi.fn().mockResolvedValue(true)
  const changed = vi.fn().mockResolvedValue(null)
  const response = eventStreamResponse(
    new Request('http://localhost/api/events'),
    {
      authorized,
      snapshot,
      changed,
      accepts: (signal) => signal.recipientId === 'worker',
    },
  )
  const reader = response.body!.getReader()
  await reader.read()
  await reader.read()
  authorized.mockClear()
  source.signal({ topic: 'announcements', recipientId: 'other' })
  expect(authorized).not.toHaveBeenCalled()
  expect(changed).not.toHaveBeenCalled()
  await reader.cancel()
})

it('bounds queued work and disconnects a client that cannot consume a burst', async () => {
  const response = eventStreamResponse(
    new Request('http://localhost/api/events'),
    {
      authorized: async () => true,
      snapshot,
      changed: async () => null,
    },
  )
  const reader = response.body!.getReader()
  await reader.read()
  await reader.read()
  for (let index = 0; index < 40; index++)
    source.signal({ topic: 'announcements' })
  expect(source.unsubscribe).toHaveBeenCalledOnce()
  expect((await reader.read()).done).toBe(true)
})
