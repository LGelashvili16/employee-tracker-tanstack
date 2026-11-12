import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { readAttendanceReviewHistory } from '../attendance.functions'
import { formatAttendanceDateTime } from '../attendance.rules'

const actions: Record<string, string> = {
  'attendance.approved': 'დადასტურება',
  'attendance.rejected': 'უარყოფა',
  'attendance.corrected': 'დროის შესწორება',
}
export function AttendanceReviewHistory({
  sessionId,
  timezone,
  embedded = false,
}: {
  sessionId: string
  timezone: string
  embedded?: boolean
}) {
  const query = useQuery({
    queryKey: ['team-attendance', 'history', sessionId],
    queryFn: () => readAttendanceReviewHistory({ data: { sessionId } }),
    retry: false,
  })
  if (query.isPending)
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="ცვლილებების ისტორია იტვირთება"
      >
        <Skeleton className="h-20" aria-hidden="true" />
      </div>
    )
  const result = query.data
  if (query.isError || !result?.ok)
    return (
      <p role="alert" className="text-sm text-destructive">
        ცვლილებების ისტორია ვერ ჩაიტვირთა.
      </p>
    )
  return (
    <section
      className={cn('flex flex-col gap-2', !embedded && 'border-t pt-4')}
    >
      {!embedded ? <h3 className="font-medium">ცვლილებების ისტორია</h3> : null}
      {!result.value.items.length ? (
        <p className="text-sm text-muted-foreground">ცვლილებები ჯერ არ არის.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.value.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 text-sm">
              <span>
                {actions[item.action] ?? 'დასწრების ცვლილება'}: {item.actorName}
                , {formatAttendanceDateTime(item.createdAt, timezone)}
              </span>
              <span className="text-muted-foreground">{item.reason}</span>
            </li>
          ))}
        </ul>
      )}
      {result.value.hasMore ? (
        <p className="text-sm text-muted-foreground">
          ნაჩვენებია ბოლო 20 ცვლილება.
        </p>
      ) : null}
    </section>
  )
}
