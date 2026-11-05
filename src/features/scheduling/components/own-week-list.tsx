import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import { formatDuration, shiftMinutes } from '../scheduling.rules'
import { weekdayLabels } from './schedule-week-editor'
import type { WorkingWeek } from '../scheduling.types'

/** One row per weekday; today's row is highlighted and days off stay readable but muted. */
export function OwnWeekList({
  week,
  todayWeekday,
}: {
  week: WorkingWeek
  todayWeekday: number
}) {
  const ordered = [...week].sort(
    (first, second) => first.weekday - second.weekday,
  )
  return (
    <ul className="flex flex-col gap-2">
      {ordered.map(({ weekday, hours }) => {
        const today = weekday === todayWeekday
        return (
          <li
            key={weekday}
            aria-current={today ? 'date' : undefined}
            className={cn(
              'flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border px-4 py-3',
              today && 'border-primary/30 bg-primary/10',
              !hours && !today && 'border-transparent bg-muted/40',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {weekdayLabels[weekday - 1]}
              {today ? <Badge variant="default">დღეს</Badge> : null}
            </span>
            {hours ? (
              <span className="flex items-center gap-3 text-sm tabular-nums">
                <span>
                  {hours.start} - {hours.end}
                </span>
                <span className="w-16 text-right text-xs text-muted-foreground">
                  {formatDuration(shiftMinutes(hours))}
                </span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                დასვენების დღე
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
