import { createContext } from 'react'
import type { RealtimeTopic } from '#/lib/realtime/realtime.schemas'

export type RealtimeSubscriber = (data: unknown) => void
export type RealtimeSubscription = (
  topic: RealtimeTopic,
  subscriber: RealtimeSubscriber,
) => () => void

export const RealtimeContext = createContext<RealtimeSubscription | null>(null)
