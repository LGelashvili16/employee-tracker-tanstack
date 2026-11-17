import { IconMoon } from '@tabler/icons-react'
import { cn } from '#/lib/utils'
import {
  formatDuration,
  shiftMinutes,
  weeklyTimeline,
} from '../scheduling.rules'
import type { WorkingWeek } from '../scheduling.types'

const shortDays = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი']

/** The agenda supplies the accessible text; this companion visual compares shift positions. */
export function OwnWeekTimeline({
  week,
  todayWeekday,
}: {
  week: WorkingWeek
  todayWeekday: number
}) {
  const scale = weeklyTimeline(week)
  const ordered = [...week].sort(
    (first, second) => first.weekday - second.weekday,
  )
  return (
    <div aria-hidden="true" className="hidden overflow-x-auto lg:block">
      <div className="min-w-[38rem]">
        <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b">
          <span />
          {ordered.map(({ weekday }) => (
            <div
              key={weekday}
              className={cn(
                'flex h-16 flex-col items-center justify-center gap-1 border-l text-sm font-medium',
                weekday === todayWeekday && 'bg-badge-blue/20',
              )}
            >
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg',
                  weekday === todayWeekday &&
                    'bg-badge-blue text-badge-blue-foreground ring-1 ring-badge-blue-foreground/40',
                )}
              >
                {shortDays[weekday - 1]}
              </span>
              {weekday === todayWeekday ? (
                <span className="text-xs text-muted-foreground">დღეს</span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
          <div className="relative my-4 h-80">
            {scale.ticks.map((tick) => (
              <span
                key={tick}
                style={{
                  top: `${((tick - scale.start) / (scale.end - scale.start)) * 100}%`,
                }}
                className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
              >
                {String(tick / 60).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {ordered.map(({ weekday, hours }) => {
            const today = weekday === todayWeekday
            const shortShift =
              hours !== null &&
              shiftMinutes(hours) / (scale.end - scale.start) < 0.3
            return (
              <div
                key={weekday}
                className={cn(
                  'border-l px-1.5',
                  today && 'bg-badge-blue/20',
                  !hours && 'bg-muted/30',
                )}
              >
                <div className="relative my-4 h-80">
                  {scale.ticks.map((tick) => (
                    <div
                      key={tick}
                      className="absolute -right-1.5 -left-1.5 border-t border-dashed border-border/70"
                      style={{
                        top: `${((tick - scale.start) / (scale.end - scale.start)) * 100}%`,
                      }}
                    />
                  ))}
                  {hours ? (
                    <div
                      className={cn(
                        'schedule-work-block absolute inset-x-0 flex flex-col justify-between rounded-lg border border-badge-blue-foreground/35 bg-badge-blue/60 text-sm text-badge-blue-foreground tabular-nums',
                        shortShift ? 'p-0' : 'overflow-hidden px-2 py-3',
                        today &&
                          'schedule-sky-shift border-badge-blue-foreground/60',
                      )}
                      data-compact={shortShift}
                      style={{
                        top: `${scale.position(hours.start)}%`,
                        height: `${scale.position(hours.end) - scale.position(hours.start)}%`,
                      }}
                    >
                      <div
                        className={cn(
                          'flex flex-col gap-1',
                          shortShift &&
                            'absolute inset-x-0 top-full pt-2 text-foreground',
                          shortShift &&
                            scale.position(hours.start) > 50 &&
                            'top-auto bottom-full pb-2 pt-0',
                        )}
                      >
                        <span className="font-semibold">{hours.start}</span>
                        {shortShift ? <span>{hours.end}</span> : null}
                        <span className="schedule-work-duration text-xs text-badge-blue-foreground/80">
                          {formatDuration(shiftMinutes(hours))}
                        </span>
                      </div>
                      {!shortShift ? (
                        <span className="schedule-work-end text-xs">
                          {hours.end}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-badge-blue/40 text-badge-blue-foreground">
                        <IconMoon className="size-5" />
                      </span>
                      <span className="text-xs">დასვენება</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
