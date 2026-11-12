import { useQueryClient } from '@tanstack/react-query'
import { useRealtimeEvents } from '#/hooks/use-realtime-events'
import { notificationRealtimeSchema } from '#/features/notifications/notifications.schemas'
import { leaveKey } from '#/features/leave/leave.queries'
import { ownScheduleOptions } from '#/features/scheduling/scheduling.queries'
import { attendanceKey } from '#/features/attendance/attendance.queries'

/** Application composition refreshes open business screens without coupling shared transport to features. */
export function useBusinessNotificationRefresh(actorId: string) {
  const client = useQueryClient()
  useRealtimeEvents('notifications', (input) => {
    const parsed = notificationRealtimeSchema.safeParse(input)
    if (!parsed.success || parsed.data.recipientId !== actorId) return
    const { changed, notification } = parsed.data
    const kind = notification?.destination?.kind
    // A reconnect snapshot reconciles changes missed while this tab was offline.
    const snapshot = !changed
    if (snapshot || kind === 'attendance') {
      void client.invalidateQueries({
        queryKey: ['my-attendance-sessions', actorId],
      })
      void client.invalidateQueries({
        queryKey: ['my-attendance-corrections', actorId],
      })
      void client.invalidateQueries({
        queryKey: ['company-attendance-users', actorId],
      })
      void client.invalidateQueries({
        queryKey: ['company-attendance-user', actorId],
      })
    }
    if (snapshot || kind === 'leave')
      void client.invalidateQueries({ queryKey: [...leaveKey, actorId] })
    if (snapshot || kind === 'schedule')
      void client.invalidateQueries({
        queryKey: ownScheduleOptions(actorId).queryKey,
      })
    if (
      snapshot ||
      kind === 'attendance' ||
      kind === 'schedule' ||
      kind === 'leave'
    ) {
      void client.invalidateQueries({ queryKey: attendanceKey(actorId) })
      void client.invalidateQueries({ queryKey: ['timesheets', actorId] })
      void client.invalidateQueries({
        queryKey: ['company-timesheets', actorId],
      })
    }
  })
}
