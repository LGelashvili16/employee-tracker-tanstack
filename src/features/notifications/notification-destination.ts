import { notificationDestinationSchema } from './notifications.schemas'

/** Only known application routes can be composed from persisted destination data. */
export function notificationDestination(input: unknown, actorId: string) {
  const parsed = notificationDestinationSchema.safeParse(input)
  if (!parsed.success) return null
  const value = parsed.data
  switch (value.kind) {
    case 'leave':
      return {
        to: value.review ? '/manage/leave' : '/leave',
        search: { requestId: value.requestId },
      } as const
    case 'schedule':
      return { to: '/schedule' } as const
    case 'job':
      return { to: '/jobs', search: { pin: value.jobId } } as const
    case 'jobs':
      return { to: '/jobs' } as const
    case 'attendance':
      return value.userId === actorId
        ? ({
            to: '/timesheets',
            search: { month: value.workDate.slice(0, 7) },
          } as const)
        : ({
            to: '/manage/attendance/$userId',
            params: { userId: value.userId },
            search: { date: value.workDate },
          } as const)
  }
}
