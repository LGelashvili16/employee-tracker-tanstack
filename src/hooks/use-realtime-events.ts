import { useContext, useEffect, useEffectEvent } from 'react'
import { RealtimeContext } from '#/contexts/realtime-context'
import type { RealtimeTopic } from '#/lib/realtime/realtime.schemas'

/** Subscribes without opening a connection. Features validate their own payloads. */
export function useRealtimeEvents(
  topic: RealtimeTopic,
  onEvent: (data: unknown) => void,
) {
  const subscribe = useContext(RealtimeContext)
  if (!subscribe) throw new Error('RealtimeProvider is required')
  const receive = useEffectEvent(onEvent)
  useEffect(() => {
    return subscribe(topic, (data) => receive(data))
  }, [subscribe, topic])
}
