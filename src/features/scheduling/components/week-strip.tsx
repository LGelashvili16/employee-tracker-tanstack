import { cn } from '#/lib/utils'
import { weekdayLabels } from './schedule-week-editor'
import type { WorkingWeek } from '../scheduling.types'

const shortWeekdayLabels = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი']

/** Read-only seven-day overview: working days show their hours, days off are muted. */
export function WeekStrip({
  days,
  density = 'compact',
}: {
  days: WorkingWeek
  density?: 'compact' | 'comfortable'
}) {
  const comfortable = density === 'comfortable'
  const ordered = [...days].sort(
    (first, second) => first.weekday - second.weekday,
  )
  return (
    <ul
      className={cn(
        'grid',
        comfortable
          ? 'grid-cols-2 gap-2 min-[480px]:grid-cols-4 sm:grid-cols-7'
          : 'grid-cols-7 gap-1.5',
      )}
    >
      {ordered.map(({ weekday, hours }) => (
        <li
          key={weekday}
          className={cn(
            'flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center',
            comfortable && 'gap-3 rounded-xl py-4',
            hours
              ? comfortable
                ? 'border-border bg-background'
                : 'border-primary/20 bg-primary/10'
              : 'border-transparent bg-muted/40 text-muted-foreground',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'text-xs font-medium',
              hours && 'text-primary',
              comfortable && 'text-sm',
            )}
          >
            {shortWeekdayLabels[weekday - 1]}
          </span>
          {hours ? (
            <span
              aria-hidden="true"
              className={cn(
                'flex flex-col text-[11px] leading-tight tabular-nums',
                comfortable && 'gap-1 text-sm',
              )}
            >
              <span>{hours.start}</span>
              <span className="text-muted-foreground">{hours.end}</span>
            </span>
          ) : (
            <span
              aria-hidden="true"
              className={cn(
                'text-[11px] leading-tight',
                comfortable && 'text-sm',
              )}
            >
              უქმე
            </span>
          )}
          <span className="sr-only">
            {weekdayLabels[weekday - 1]}:{' '}
            {hours ? `${hours.start}-დან ${hours.end}-მდე` : 'უქმე დღე'}
          </span>
        </li>
      ))}
    </ul>
  )
}
