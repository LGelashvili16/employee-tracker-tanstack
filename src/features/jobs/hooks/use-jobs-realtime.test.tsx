import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { RealtimeProvider } from '#/providers/realtime-provider'
import { useJobsRealtime } from './use-jobs-realtime'

vi.mock('../jobs.functions', () => ({
  readJobs: vi.fn(),
  readJob: vi.fn(),
  findJobLocations: vi.fn(),
  suggestJobAddress: vi.fn(),
}))
class TestSource extends EventTarget {
  static source: TestSource
  close = vi.fn()
  constructor() {
    super()
    TestSource.source = this
  }
  send(data: unknown) {
    this.dispatchEvent(new MessageEvent('jobs', { data: JSON.stringify(data) }))
  }
}
afterEach(() => vi.unstubAllGlobals())
it('reconciles the entire jobs workspace on live changes and reconnect without accepting foreign or malformed events', () => {
  vi.stubGlobal('EventSource', TestSource)
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <RealtimeProvider actorId="worker">{children}</RealtimeProvider>
      </QueryClientProvider>
    )
  }
  const { unmount } = renderHook(() => useJobsRealtime('worker'), { wrapper })
  act(() => TestSource.source.send({ recipientId: 'other', changed: true }))
  act(() => TestSource.source.send({ recipientId: 'worker', changed: 'yes' }))
  expect(invalidate).not.toHaveBeenCalled()
  act(() => TestSource.source.send({ recipientId: 'worker', changed: false }))
  act(() => TestSource.source.send({ recipientId: 'worker', changed: true }))
  expect(invalidate).toHaveBeenCalledTimes(2)
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['jobs', 'worker'] })
  unmount()
  expect(TestSource.source.close).toHaveBeenCalledOnce()
})
