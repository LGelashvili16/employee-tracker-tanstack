import { useQuery } from '@tanstack/react-query'
import { IconCalendarWeek } from '@tabler/icons-react'
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

export function OwnScheduleView({ actorId }: { actorId: string }) {
  const query = useQuery(ownScheduleOptions(actorId))
  const schedule = query.data?.ok ? query.data.value : null

  if (query.isPending)
    return (
      <div role="status" aria-busy="true" aria-label="განრიგი იტვირთება">
        <div aria-hidden="true" className="flex flex-col gap-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
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
    <div className="flex flex-col gap-6">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat label="სამუშაო დღე კვირაში" value={String(workingDays)} />
        <Stat
          label="სამუშაო საათი კვირაში"
          value={formatDuration(weeklyMinutes(schedule.week))}
        />
        <Stat
          label="დღეს"
          value={
            todayHours
              ? `${todayHours.start} - ${todayHours.end} (${formatDuration(shiftMinutes(todayHours))})`
              : 'დასვენების დღე'
          }
        />
      </dl>
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <IconCalendarWeek className="size-5" aria-hidden="true" />
            </span>
            სამუშაო კვირა
          </CardTitle>
          <Badge
            variant={schedule.source === 'individual' ? 'default' : 'secondary'}
          >
            {schedule.source === 'individual'
              ? 'ინდივიდუალური განრიგი'
              : 'კომპანიის განრიგი'}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <OwnWeekList week={schedule.week} todayWeekday={todayWeekday} />
          <p className="text-xs text-muted-foreground">
            დროის სარტყელი: {schedule.timezone}. განრიგის შეცვლა შეუძლია
            ადმინისტრატორს.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
