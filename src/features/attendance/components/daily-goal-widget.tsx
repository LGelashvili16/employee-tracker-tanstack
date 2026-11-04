import { IconTargetArrow } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Progress } from '#/components/ui/progress'
import {
  DAILY_WORK_TARGET_SECONDS,
  formatAttendanceDuration,
} from '../attendance.rules'
import { useElapsedSeconds } from '../hooks/use-elapsed-seconds'
import type { AttendanceOverview } from '../attendance.types'

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
    <Card className="h-full rounded-2xl shadow-sm [--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-badge-green text-badge-green-foreground">
            <IconTargetArrow className="size-5" aria-hidden="true" />
          </span>
          დღის მიზანი
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
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
            {remaining === 0 ? (
              <p className="text-sm text-badge-green-foreground">
                მიზანი მიღწეულია
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              მიზანი: 8 სთ აღრიცხული დრო. შესვენება ავტომატურად არ აკლდება.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
