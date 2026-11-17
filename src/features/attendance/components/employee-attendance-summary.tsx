import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  IconCalendarCheck,
  IconClock,
  IconClockExclamation,
  IconCheck,
  IconMinus,
} from '@tabler/icons-react'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import {
  attendanceWeek,
  formatWorkedTime,
  sessionMetrics,
} from '../attendance.rules'
import type { CompanyAttendanceUser } from '../company-attendance.types'
import { cn } from '#/lib/utils'

const monthStartColumns = [
  'xl:first:col-start-7',
  'xl:first:col-start-1',
  'xl:first:col-start-2',
  'xl:first:col-start-3',
  'xl:first:col-start-4',
  'xl:first:col-start-5',
  'xl:first:col-start-6',
]

export function EmployeeAttendanceSummary({
  result,
  monthly = false,
}: {
  monthly?: boolean
  result: CompanyAttendanceUser
}) {
  const start = monthly ? result.date : attendanceWeek(result.date).start
  const length = monthly
    ? differenceInCalendarDays(parseISO(result.endDate), parseISO(start)) + 1
    : 7
  const days = Array.from({ length }, (_, index) => {
    const date = format(addDays(parseISO(start), index), 'yyyy-MM-dd')
    const sessions = result.sessions.filter((session) => session.date === date)
    const first = [...sessions]
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .at(0)
    return {
      date,
      sessions,
      open: sessions.some((session) => !session.endedAt),
      seconds: sessions.reduce(
        (sum, session) =>
          sum +
          sessionMetrics(
            session.startedAt,
            session.endedAt,
            session.expectedStartAt,
            session.expectedEndAt,
            result.serverNow,
          ).seconds,
        0,
      ),
      late: first
        ? sessionMetrics(
            first.startedAt,
            first.endedAt,
            first.expectedStartAt,
            first.expectedEndAt,
            result.serverNow,
          ).lateSeconds > 0
        : false,
    }
  })
  const statistics = [
    {
      label: 'აღრიცხული დრო',
      value: formatWorkedTime(days.reduce((sum, day) => sum + day.seconds, 0)),
      icon: IconClock,
    },
    {
      label: 'დღეები ჩანაწერით',
      value: String(days.filter((day) => day.sessions.length).length),
      icon: IconCalendarCheck,
    },
    {
      label: 'გვიან დაწყებული დღეები',
      value: String(days.filter((day) => day.late).length),
      icon: IconClockExclamation,
    },
  ]
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <dl className="grid gap-4 sm:grid-cols-3">
        {statistics.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                <dd className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                  {stat.value}
                </dd>
              </div>
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <stat.icon className="size-5" aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        ))}
      </dl>
      <Card>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">
              {monthly ? 'თვის აქტივობა' : 'კვირის აქტივობა'}
            </h2>
            <span className="text-xs text-muted-foreground">
              {result.sessions.some((session) => !session.endedAt)
                ? 'მიმდინარე სესიის დრო წინასწარია'
                : monthly
                  ? 'არჩეული თვე'
                  : 'არჩეული კვირა'}
            </span>
          </div>
          <ol
            aria-label={
              monthly
                ? 'თვის დასწრების მიმოხილვა'
                : 'კვირის დასწრების მიმოხილვა'
            }
            className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7"
          >
            {days.map((day) => (
              <li
                key={day.date}
                aria-current={day.date === result.today ? 'date' : undefined}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border bg-muted/20 p-3',
                  monthly && monthStartColumns[parseISO(start).getDay()],
                  day.date === result.today && 'border-primary/40 bg-primary/5',
                )}
              >
                <time dateTime={day.date} className="text-xs font-medium">
                  {format(parseISO(day.date), 'EEE, d', { locale: ka })}
                </time>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground',
                      day.sessions.length > 0 &&
                        'bg-badge-green text-badge-green-foreground',
                    )}
                  >
                    {day.open ? (
                      <IconClock className="size-4" aria-hidden="true" />
                    ) : day.sessions.length ? (
                      <IconCheck className="size-4" aria-hidden="true" />
                    ) : (
                      <IconMinus className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <span className="text-xs tabular-nums">
                    {day.sessions.length
                      ? formatWorkedTime(day.seconds)
                      : 'ჩანაწერი არ არის'}
                  </span>
                </div>
                {day.open ? (
                  <Badge variant="green" className="w-fit">
                    მიმდინარე
                  </Badge>
                ) : day.late ? (
                  <Badge variant="orange" className="w-fit">
                    გვიანი დაწყება
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {day.sessions.length
                      ? 'დაფიქსირებულია'
                      : day.date === result.today
                        ? 'დღეს'
                        : ' '}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
