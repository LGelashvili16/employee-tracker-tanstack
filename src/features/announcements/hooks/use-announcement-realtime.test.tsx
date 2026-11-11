import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAnnouncementRealtime } from './use-announcement-realtime'
import { RealtimeProvider } from '#/providers/realtime-provider'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({ toast: vi.fn(), navigate: vi.fn() }))
vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('../announcements.functions', () => ({
  getAnnouncements: vi.fn(),
  getAnnouncementDetail: vi.fn(),
  getPendingAnnouncement: vi.fn(),
}))
vi.mock('#/features/notifications/notifications.functions', () => ({
  getOwnNotifications: vi.fn(),
}))

class TestEventSource extends EventTarget {
  static instances: Array<TestEventSource> = []
  close = vi.fn()
  constructor(public url: string) {
    super()
    TestEventSource.instances.push(this)
  }
  send(data: unknown) {
    this.dispatchEvent(
      new MessageEvent('announcements', { data: JSON.stringify(data) }),
    )
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  TestEventSource.instances = []
  vi.stubGlobal('EventSource', TestEventSource)
})
afterEach(() => vi.unstubAllGlobals())
function setup() {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <RealtimeProvider actorId="worker">{children}</RealtimeProvider>
    </QueryClientProvider>
  )
  const hook = renderHook(() => useAnnouncementRealtime('worker'), { wrapper })
  return { ...hook, source: TestEventSource.instances[0], invalidate }
}
const published = {
  id: '019aac01-0000-7000-8000-000000000001',
  title: 'კომპანიის სიახლე',
  showOnLogin: false,
}

it('updates the unread dot from snapshots and acknowledges other-device reading without old toasts', async () => {
  const { result, source, invalidate, unmount } = setup()
  expect(source.url).toBe('/api/events')
  act(() => source.send({ unreadCount: 2 }))
  expect(result.current.hasUnreadAnnouncements).toBe(true)
  expect(mocks.toast).not.toHaveBeenCalled()
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['announcements', 'worker'],
  })
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['notifications', 'worker'],
  })
  act(() => source.send({ unreadCount: 0 }))
  expect(result.current.hasUnreadAnnouncements).toBe(false)
  expect(TestEventSource.instances).toHaveLength(1)
  unmount()
  expect(source.close).toHaveBeenCalledOnce()
})

it('shows one six-second bottom-right toast per new publication and opens its announcement', async () => {
  const { source } = setup()
  act(() => {
    source.send({ unreadCount: 1, published })
    source.send({ unreadCount: 1, published })
  })
  expect(mocks.toast).toHaveBeenCalledOnce()
  const options = mocks.toast.mock.calls[0][1]
  expect(options).toMatchObject({
    duration: 6000,
    position: 'bottom-right',
    description: published.title,
  })
  act(() => options.action.onClick())
  expect(mocks.navigate).toHaveBeenCalledWith({
    to: '/announcements',
    search: { announcementId: published.id },
  })
})

it('refreshes the modal queue without a duplicate toast for modal announcements', () => {
  const { source, invalidate, result } = setup()
  act(() =>
    source.send({
      unreadCount: 1,
      published: { ...published, showOnLogin: true },
    }),
  )
  expect(result.current.hasUnreadAnnouncements).toBe(true)
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['announcements', 'worker'],
  })
  expect(mocks.toast).not.toHaveBeenCalled()
})

it('ignores malformed payloads and closes the source when the session ends', async () => {
  const { source, result } = setup()
  act(() => source.send({ unreadCount: -1, published }))
  expect(result.current.hasUnreadAnnouncements).toBe(false)
  expect(mocks.toast).not.toHaveBeenCalled()
  source.dispatchEvent(new Event('session-ended'))
  await waitFor(() => expect(source.close).toHaveBeenCalledOnce())
})
