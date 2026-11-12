import { useQueryClient } from '@tanstack/react-query'
import { useRealtimeEvents } from '#/hooks/use-realtime-events'
import { jobsRealtimeSchema } from '../jobs.schemas'
import { jobsKeys } from '../jobs.queries'

export function useJobsRealtime(actorId: string) {
  const client = useQueryClient()
  useRealtimeEvents('jobs', (input) => {
    const parsed = jobsRealtimeSchema.safeParse(input)
    if (parsed.success && parsed.data.recipientId === actorId)
      void client.invalidateQueries({ queryKey: jobsKeys.all(actorId) })
  })
}
