import { IconCheck, IconTargetArrow } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Progress } from '#/components/ui/progress'
import {
  DAILY_WORK_TARGET_SECONDS,
  formatAttendanceDuration,
} from '../attendance.rules'
import { useElapsedSeconds } from '../hooks/use-elapsed-seconds'
import type { AttendanceOverview } from '../attendance.types'
import { cn } from '#/lib/utils'

const checkpoints = [2, 4, 6, 8]

export function DailyGoalWidget({
  overview,
}: {
  overview: AttendanceOverview
}) {
  // Yesterday's open session keeps its own workday and must not advance today's goal.
  const running = overview.openSession?.workDate === overview.workday.date
  const total = (overview.today?.seconds ?? 0) + useElapsedSeconds(running)
  const remaining = Math.max(0, DAILY_WORK_TARGET_SECONDS - total)
  const percent = Math.min(
    100,
    Math.max(0, Math.floor((total / DAILY_WORK_TARGET_SECONDS) * 100)),
  )
  return (
    <Card className="h-full rounded-2xl bg-gradient-to-br from-badge-green/10 via-card to-card shadow-sm [--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-badge-green text-badge-green-foreground">
            <IconTargetArrow className="size-5" aria-hidden="true" />
          </span>
          დღის მიზანი
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {overview.workday.kind !== 'scheduled' ? (
          <p className="text-sm text-muted-foreground">
            {overview.workday.kind === 'day_off'
              ? 'დღეს დასვენების დღეა.'
              : 'მიზნის საჩვენებლად საჭიროა სამუშაო განრიგი.'}
          </p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-2">
              <div>
                <span className="text-4xl font-semibold tracking-tight tabular-nums">
                  {formatAttendanceDuration(remaining)}
                </span>
                <p className="text-xs text-muted-foreground">მიზნამდე დარჩა</p>
              </div>
              <Badge variant={remaining === 0 ? 'green' : 'secondary'}>
                {percent}%
              </Badge>
            </div>
            <Progress
              value={percent}
              aria-label="დღის მიზნის შესრულება"
              aria-valuetext={`${percent}%, აღრიცხულია ${formatAttendanceDuration(total)}, მიზნამდე დარჩა ${formatAttendanceDuration(remaining)}`}
            />
            <ol
              aria-label="დღის მიზნის ეტაპები"
              className="grid grid-cols-4 gap-2"
            >
              {checkpoints.map((hours) => {
                const complete = total >= hours * 3600
                return (
                  <li
                    key={hours}
                    className={cn(
                      'flex items-center justify-center gap-1.5 text-xs tabular-nums',
                      complete
                        ? 'text-badge-green-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-4 items-center justify-center rounded-full border',
                        complete
                          ? 'border-badge-green-foreground/20 bg-badge-green'
                          : 'border-border bg-muted/40',
                      )}
                    >
                      {complete ? <IconCheck className="size-3" /> : null}
                    </span>
                    <span>
                      {hours} სთ
                      <span className="sr-only">
                        {complete ? ', მიღწეულია' : ', ჯერ არ მიღწეულა'}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ol>
            {remaining === 0 ? (
              <p className="text-sm text-badge-green-foreground">
                მიზანი მიღწეულია
              </p>
            ) : null}
            <div className="mt-auto flex flex-col gap-2 border-t border-badge-green-foreground/10 pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  დღეს აღრიცხულია
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatAttendanceDuration(total)}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                მიზანი: 8 სთ აღრიცხული დრო. შესვენება ავტომატურად არ აკლდება.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
