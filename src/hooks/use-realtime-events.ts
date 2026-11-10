import { useEffect, useEffectEvent } from 'react'

/** Mounted once in the application shell. Native EventSource owns reconnection. */
export function useRealtimeEvents(
  actorId: string,
  onEvent: (data: unknown) => void,
) {
  const receive = useEffectEvent(onEvent)
  useEffect(() => {
    if (typeof EventSource === 'undefined') return
    const source = new EventSource('/api/events')
    source.addEventListener('announcements', (event: MessageEvent<string>) => {
      try {
        receive(JSON.parse(event.data))
      } catch {
        /* Ignore malformed frames. */
      }
    })
    source.addEventListener('session-ended', () => source.close())
    return () => source.close()
  }, [actorId])
}
