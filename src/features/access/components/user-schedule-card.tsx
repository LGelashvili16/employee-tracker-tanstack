import { IconCalendarWeek } from '@tabler/icons-react'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { WeekStrip } from '#/features/scheduling/components/week-strip'
import type { WorkingWeek } from '#/features/scheduling/scheduling.types'

/** Shows the employee's own week, or the company week they inherit, with a badge saying which one it is. */
export function UserScheduleCard({
  week,
  companyWeek,
}: {
  week: WorkingWeek | null
  companyWeek: WorkingWeek | null
}) {
  const days = week ?? companyWeek
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IconCalendarWeek className="size-5" aria-hidden="true" />
          </span>
          სამუშაო განრიგი
        </CardTitle>
        <Badge variant={week ? 'default' : 'secondary'}>
          {week ? 'ინდივიდუალური' : 'კომპანიის განრიგი'}
        </Badge>
      </CardHeader>
      <CardContent>
        {days ? (
          <WeekStrip days={days} />
        ) : (
          <p className="text-sm text-muted-foreground">
            კომპანიის სამუშაო განრიგი ჯერ არ არის განსაზღვრული.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
