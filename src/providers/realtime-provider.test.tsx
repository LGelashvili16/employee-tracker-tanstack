import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RealtimeProvider } from './realtime-provider'
import { useRealtimeEvents } from '#/hooks/use-realtime-events'

class TestEventSource extends EventTarget {
  static instances: Array<TestEventSource> = []
  close = vi.fn()
  constructor(public url: string) {
    super()
    TestEventSource.instances.push(this)
  }
  send(data: string, topic = 'announcements') {
    this.dispatchEvent(new MessageEvent(topic, { data }))
  }
}
beforeEach(() => {
  TestEventSource.instances = []
  vi.stubGlobal('EventSource', TestEventSource)
})
afterEach(() => vi.unstubAllGlobals())
function Consumer({ receive }: { receive: (data: unknown) => void }) {
  useRealtimeEvents('announcements', receive)
  return null
}

it('shares one source, uses current callbacks, and removes unmounted subscriptions', () => {
  const first = vi.fn()
  const second = vi.fn()
  const updated = vi.fn()
  const { rerender, unmount } = render(
    <RealtimeProvider actorId="worker">
      <Consumer receive={first} />
      <Consumer receive={second} />
    </RealtimeProvider>,
  )
  expect(TestEventSource.instances).toHaveLength(1)
  const source = TestEventSource.instances[0]
  expect(source.url).toBe('/api/events')
  act(() => source.send('{"unreadCount":2}'))
  expect(first).toHaveBeenCalledWith({ unreadCount: 2 })
  expect(second).toHaveBeenCalledWith({ unreadCount: 2 })
  rerender(
    <RealtimeProvider actorId="worker">
      <Consumer receive={updated} />
    </RealtimeProvider>,
  )
  act(() => {
    source.send('invalid JSON')
    source.send('{}', 'unknown-topic')
    source.send('{"unreadCount":0}')
  })
  expect(first).toHaveBeenCalledOnce()
  expect(second).toHaveBeenCalledOnce()
  expect(updated).toHaveBeenCalledExactlyOnceWith({ unreadCount: 0 })
  expect(TestEventSource.instances).toHaveLength(1)
  unmount()
  expect(source.close).toHaveBeenCalledOnce()
  act(() => source.send('{}'))
  expect(updated).toHaveBeenCalledOnce()
})

it('closes on session end and replaces the source when the account changes', () => {
  const { rerender, unmount } = render(
    <RealtimeProvider key="first" actorId="first">
      {null}
    </RealtimeProvider>,
  )
  const first = TestEventSource.instances[0]
  act(() => first.dispatchEvent(new Event('session-ended')))
  expect(first.close).toHaveBeenCalledOnce()
  rerender(
    <RealtimeProvider key="second" actorId="second">
      {null}
    </RealtimeProvider>,
  )
  expect(TestEventSource.instances).toHaveLength(2)
  unmount()
  expect(TestEventSource.instances[1].close).toHaveBeenCalledOnce()
})
