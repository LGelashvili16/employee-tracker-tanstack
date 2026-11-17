import { useEffect, useState } from 'react'
import { RealtimeContext } from '#/contexts/realtime-context'
import { realtimeTopicSchema } from '#/lib/realtime/realtime.schemas'
import type {
  RealtimeSubscriber,
  RealtimeSubscription,
} from '#/contexts/realtime-context'
import type { RealtimeTopic } from '#/lib/realtime/realtime.schemas'
import type { ReactNode } from 'react'

/** One account-scoped connection; feature consumers only subscribe to its topics. */
export function RealtimeProvider({
  actorId,
  children,
}: {
  actorId: string
  children: ReactNode
}) {
  const [subscribers] = useState(
    () => new Map<RealtimeTopic, Set<RealtimeSubscriber>>(),
  )
  const [subscribe] = useState<RealtimeSubscription>(
    () => (topic: RealtimeTopic, subscriber: RealtimeSubscriber) => {
      let listeners = subscribers.get(topic)
      if (!listeners) {
        listeners = new Set()
        subscribers.set(topic, listeners)
      }
      listeners.add(subscriber)
      return () => {
        listeners.delete(subscriber)
        if (!listeners.size) subscribers.delete(topic)
      }
    },
  )
  useEffect(() => {
    if (typeof EventSource === 'undefined') return
    const source = new EventSource('/api/events')
    for (const topic of realtimeTopicSchema.options) {
      source.addEventListener(topic, (event: MessageEvent<string>) => {
        let data: unknown
        try {
          data = JSON.parse(event.data)
        } catch {
          return
        }
        for (const subscriber of subscribers.get(topic) ?? []) subscriber(data)
      })
    }
    source.addEventListener('session-ended', () => source.close())
    return () => source.close()
  }, [actorId, subscribers])
  return <RealtimeContext value={subscribe}>{children}</RealtimeContext>
}
