import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { RealtimeProvider } from '#/providers/realtime-provider'
import { useNotificationRealtime } from './use-notification-realtime'

const live = vi.hoisted(() => ({ toast: vi.fn(), navigate: vi.fn() }))
vi.mock('sonner', () => ({ toast: live.toast }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => live.navigate }))
vi.mock('../notifications.functions', () => ({ getOwnNotifications: vi.fn() }))
class TestSource extends EventTarget {
  static source: TestSource
  close = vi.fn()
  constructor() {
    super()
    TestSource.source = this
  }
  send(data: unknown) {
    this.dispatchEvent(
      new MessageEvent('notifications', { data: JSON.stringify(data) }),
    )
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('EventSource', TestSource)
})
afterEach(() => vi.unstubAllGlobals())

it('reconciles all inbox variants, ignores foreign and malformed events, never replays snapshots or read synchronization', () => {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <RealtimeProvider actorId="worker">{children}</RealtimeProvider>
      </QueryClientProvider>
    )
  }
  renderHook(() => useNotificationRealtime('worker'), { wrapper })
  const item = {
    id: '019b1234-1234-7123-8123-123456789abc',
    title: 'განახლება',
    destination: { kind: 'schedule' },
  }
  act(() => {
    TestSource.source.send({
      recipientId: 'other',
      changed: true,
      notification: item,
    })
    TestSource.source.send({
      recipientId: 'worker',
      changed: true,
      notification: {
        ...item,
        destination: { kind: 'schedule', href: 'https://example.com' },
      },
    })
  })
  expect(invalidate).not.toHaveBeenCalled()
  act(() => {
    TestSource.source.send({
      recipientId: 'worker',
      changed: false,
      notification: item,
    })
    TestSource.source.send({ recipientId: 'worker', changed: true })
    TestSource.source.send({
      recipientId: 'worker',
      changed: true,
      notification: { ...item, liveToast: false },
    })
  })
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['notifications', 'worker'],
  })
  expect(live.toast).not.toHaveBeenCalled()
  act(() => {
    TestSource.source.send({
      recipientId: 'worker',
      changed: true,
      notification: item,
    })
    TestSource.source.send({
      recipientId: 'worker',
      changed: true,
      notification: item,
    })
  })
  expect(live.toast).toHaveBeenCalledTimes(1)
  expect(live.toast).toHaveBeenCalledWith(
    'განახლება',
    expect.objectContaining({
      duration: 6000,
      position: 'bottom-right',
      action: expect.objectContaining({ label: 'ნახვა' }),
    }),
  )
  live.toast.mock.calls[0][1].action.onClick()
  expect(live.navigate).toHaveBeenCalledWith({ to: '/schedule' })
})

it('reconciles each tab and each cached page without invalidating another account', () => {
  const tabs = Array.from({ length: 2 }, () => {
    const client = new QueryClient()
    const keys = [
      ['notifications', 'worker', 5, 0],
      ['notifications', 'worker', 30, 30],
      ['notifications', 'other', 5, 0],
    ]
    for (const key of keys) client.setQueryData(key, { unseenCount: 0 })
    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={client}>
          <RealtimeProvider actorId="worker">{children}</RealtimeProvider>
        </QueryClientProvider>
      )
    }
    renderHook(() => useNotificationRealtime('worker'), { wrapper })
    return { client, keys, source: TestSource.source }
  })
  for (const tab of tabs)
    act(() => tab.source.send({ recipientId: 'worker', changed: true }))
  for (const { client, keys } of tabs)
    expect(keys.map((key) => client.getQueryState(key)?.isInvalidated)).toEqual(
      [true, true, false],
    )
  expect(live.toast).not.toHaveBeenCalled()
})
