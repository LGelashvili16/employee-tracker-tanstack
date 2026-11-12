import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { RealtimeProvider } from '#/providers/realtime-provider'
import { useComplaintRealtime } from './use-complaint-realtime'

const live = vi.hoisted(() => ({ toast: vi.fn(), navigate: vi.fn() }))
vi.mock('sonner', () => ({ toast: live.toast }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => live.navigate }))

vi.mock('../complaints.functions', () => ({
  getComplaint: vi.fn(),
  getComplaints: vi.fn(),
  getComplaintReviewers: vi.fn(),
}))
vi.mock('#/features/notifications/notifications.functions', () => ({
  getOwnNotifications: vi.fn(),
}))
class TestSource extends EventTarget {
  static source: TestSource
  close = vi.fn()
  constructor() {
    super()
    TestSource.source = this
  }
  send(data: unknown, topic = 'complaints') {
    this.dispatchEvent(new MessageEvent(topic, { data: JSON.stringify(data) }))
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('EventSource', TestSource)
})
afterEach(() => vi.unstubAllGlobals())
it('reconciles complaint caches on live events and reconnect snapshots only after validation', () => {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <RealtimeProvider actorId="worker">{children}</RealtimeProvider>
      </QueryClientProvider>
    )
  }
  renderHook(() => useComplaintRealtime('worker'), { wrapper })
  act(() => TestSource.source.send({ changed: 'yes' }))
  expect(invalidate).not.toHaveBeenCalled()
  act(() => TestSource.source.send({ changed: false }))
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['complaints', 'worker'],
  })
  expect(invalidate).not.toHaveBeenCalledWith({
    queryKey: ['notifications', 'worker'],
  })
  invalidate.mockClear()
  act(() =>
    TestSource.source.send({
      changed: true,
      id: '019aac01-0000-7000-8000-000000000001',
    }),
  )
  expect(invalidate).toHaveBeenCalledTimes(1)
  invalidate.mockClear()
  act(() => TestSource.source.send({ changed: true }, 'announcements'))
  expect(invalidate).not.toHaveBeenCalled()
})

it('shows a live complaint toast and exposes unread management state without replaying snapshots', () => {
  const client = new QueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <RealtimeProvider actorId="hr">{children}</RealtimeProvider>
      </QueryClientProvider>
    )
  }
  const { result } = renderHook(() => useComplaintRealtime('hr'), { wrapper })
  act(() =>
    TestSource.source.send({ changed: false, hasUnreadComplaints: true }),
  )
  expect(result.current).toEqual({ hasUnreadComplaints: true })
})

it('deduplicates live complaint toasts and never replays them from reconnect snapshots', () => {
  const client = new QueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <RealtimeProvider actorId="hr">{children}</RealtimeProvider>
      </QueryClientProvider>
    )
  }
  const { result } = renderHook(() => useComplaintRealtime('hr'), { wrapper })
  act(() =>
    TestSource.source.send({ changed: false, hasUnreadComplaints: true }),
  )
  expect(live.toast).not.toHaveBeenCalled()
  const event = {
    changed: true,
    hasUnreadComplaints: true,
    id: '019aac01-0000-7000-8000-000000000001',
    notification: { id: '019aac01-0000-7000-8000-000000000002', review: true },
  }
  act(() => {
    TestSource.source.send(event)
    TestSource.source.send(event)
  })
  expect(live.toast).toHaveBeenCalledOnce()
  expect(live.toast.mock.calls[0][1]).toMatchObject({
    duration: 6000,
    position: 'bottom-right',
  })
  act(() => live.toast.mock.calls[0][1].action.onClick())
  expect(live.navigate).toHaveBeenCalledWith({
    to: '/manage/complaints',
    search: { complaintId: event.id },
  })
  act(() =>
    TestSource.source.send({ changed: false, hasUnreadComplaints: false }),
  )
  expect(result.current.hasUnreadComplaints).toBe(false)
  expect(live.toast).toHaveBeenCalledOnce()
})
