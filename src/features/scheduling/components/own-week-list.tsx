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
    <ul className="divide-y">
      {ordered.map(({ weekday, hours }) => {
        const today = weekday === todayWeekday
        return (
          <li
            key={weekday}
            aria-current={today ? 'date' : undefined}
            className={cn(
              'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4',
              today && 'bg-badge-blue/20',
              !hours && !today && 'bg-muted/30 text-muted-foreground',
            )}
          >
            <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {weekdayLabels[weekday - 1]}
              {today ? <Badge variant="blue">დღეს</Badge> : null}
            </span>
            {hours ? (
              <span className="flex flex-col items-end gap-1 text-sm text-badge-blue-foreground tabular-nums">
                <span>
                  {hours.start} - {hours.end}
                </span>
                <span className="text-xs text-muted-foreground">
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
