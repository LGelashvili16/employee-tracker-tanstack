import { useQuery } from '@tanstack/react-query'
import { IconClock, IconMoon, IconSunrise } from '@tabler/icons-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { ownScheduleOptions } from '../scheduling.queries'
import {
  formatDuration,
  isoWeekday,
  shiftMinutes,
  weeklyMinutes,
} from '../scheduling.rules'
import { OwnWeekList } from './own-week-list'
import { OwnWeekTimeline } from './own-week-timeline'
import { formatAttendanceDate } from '#/features/attendance/attendance.presentation'

export function OwnScheduleView({ actorId }: { actorId: string }) {
  const query = useQuery(ownScheduleOptions(actorId))
  const schedule = query.data?.ok ? query.data.value : null

  if (query.isPending)
    return (
      <div role="status" aria-busy="true" aria-label="განრიგი იტვირთება">
        <div aria-hidden="true" className="flex flex-col gap-4">
          <div className="grid gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
            <Skeleton className="h-80 rounded-2xl xl:h-[32rem]" />
            <Skeleton className="h-[32rem] rounded-2xl" />
          </div>
        </div>
      </div>
    )
  if (!schedule)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          განრიგის ჩატვირთვა ვერ მოხერხდა. განაახლეთ გვერდი ან სცადეთ
          მოგვიანებით.
        </AlertDescription>
      </Alert>
    )
  if (!schedule.week)
    return (
      <Alert variant="info" role="note">
        <AlertDescription>
          თქვენი სამუშაო განრიგი ჯერ არ არის განსაზღვრული. მიმართეთ
          ადმინისტრატორს.
        </AlertDescription>
      </Alert>
    )

  const todayWeekday = isoWeekday(schedule.today)
  const todayHours = schedule.week.find(
    (day) => day.weekday === todayWeekday,
  )?.hours
  const workingDays = schedule.week.filter((day) => day.hours).length
  return (
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
      <Card className="gap-0 overflow-hidden rounded-2xl py-0 xl:sticky xl:top-6">
        <CardHeader className="schedule-daylight-panel gap-6 p-6">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              {todayHours ? (
                <IconClock className="size-5" aria-hidden="true" />
              ) : (
                <IconMoon className="size-5" aria-hidden="true" />
              )}
              დღეს
            </CardTitle>
            <Badge variant={todayHours ? 'blue' : 'purple'}>
              {todayHours ? 'სამუშაო დღე' : 'დასვენება'}
            </Badge>
          </div>
          <time dateTime={schedule.today} className="text-sm opacity-80">
            {formatAttendanceDate(schedule.today)}
          </time>
          {todayHours ? (
            <dl className="grid grid-cols-1 gap-5">
              <div className="flex flex-col gap-1">
                <dt className="flex items-center gap-2 text-sm opacity-80">
                  <IconSunrise className="size-4" aria-hidden="true" />
                  დაწყება
                </dt>
                <dd className="text-4xl font-semibold tracking-tight tabular-nums">
                  {todayHours.start}
                </dd>
              </div>
              <div className="schedule-night-copy flex flex-col gap-1">
                <dt className="flex items-center gap-2 text-sm opacity-80">
                  <IconMoon className="size-4" aria-hidden="true" />
                  დასრულება
                </dt>
                <dd className="text-4xl font-semibold tracking-tight tabular-nums">
                  {todayHours.end}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-2xl font-semibold tracking-tight">
              დღეს ისვენებთ
            </p>
          )}
          {todayHours ? (
            <p className="schedule-night-copy text-sm opacity-80">
              დაგეგმილია {formatDuration(shiftMinutes(todayHours))}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-5 p-6">
          <h2 className="text-sm font-medium">კვირის მიმოხილვა</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">სამუშაო დღე</dt>
              <dd className="text-2xl font-semibold text-badge-blue-foreground tabular-nums">
                {workingDays}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">სამუშაო დრო</dt>
              <dd className="text-lg font-semibold text-badge-blue-foreground tabular-nums">
                {formatDuration(weeklyMinutes(schedule.week))}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <Card className="min-w-0 gap-0 overflow-hidden rounded-2xl py-0">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <CardTitle>
            <h2>სამუშაო კვირა</h2>
          </CardTitle>
          <Badge variant="blue">
            {schedule.source === 'individual'
              ? 'ინდივიდუალური განრიგი'
              : 'კომპანიის განრიგი'}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <OwnWeekTimeline week={schedule.week} todayWeekday={todayWeekday} />
          <div className="lg:sr-only">
            <OwnWeekList week={schedule.week} todayWeekday={todayWeekday} />
          </div>
        </CardContent>
        <p className="border-t px-5 py-4 text-xs leading-5 text-muted-foreground">
          ყოველკვირეული განრიგი. ცვლილებისთვის მიმართეთ ადმინისტრატორს.
        </p>
      </Card>
    </div>
  )
}
