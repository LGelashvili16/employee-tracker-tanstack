import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { weekdayLabels } from './schedule-week-editor'
import type { CompanySchedule } from '../scheduling.schemas'

export function ScheduleSummary({
  schedule,
  title,
}: {
  schedule: CompanySchedule
  title: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid gap-2 text-sm">
          {schedule.days.map((day) => (
            <div
              key={day.weekday}
              className="flex flex-wrap justify-between gap-2"
            >
              <dt>{weekdayLabels[day.weekday - 1]}</dt>
              <dd>
                {day.hours
                  ? `${day.hours.start} - ${day.hours.end}`
                  : 'დასვენების დღე'}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
