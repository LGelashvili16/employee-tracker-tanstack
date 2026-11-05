import { cn } from '#/lib/utils'
import { weekdayLabels } from './schedule-week-editor'
import type { WorkingWeek } from '../scheduling.types'

const shortWeekdayLabels = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი']

/** Read-only seven-day overview: working days show their hours, days off are muted. */
export function WeekStrip({ days }: { days: WorkingWeek }) {
  const ordered = [...days].sort(
    (first, second) => first.weekday - second.weekday,
  )
  return (
    <ul className="grid grid-cols-7 gap-1.5">
      {ordered.map(({ weekday, hours }) => (
        <li
          key={weekday}
          className={cn(
            'flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center',
            hours
              ? 'border-primary/20 bg-primary/10'
              : 'border-transparent bg-muted/40 text-muted-foreground',
          )}
        >
          <span
            aria-hidden="true"
            className={cn('text-xs font-medium', hours && 'text-primary')}
          >
            {shortWeekdayLabels[weekday - 1]}
          </span>
          {hours ? (
            <span
              aria-hidden="true"
              className="flex flex-col text-[11px] leading-tight tabular-nums"
            >
              <span>{hours.start}</span>
              <span className="text-muted-foreground">{hours.end}</span>
            </span>
          ) : (
            <span aria-hidden="true" className="text-[11px] leading-tight">
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
