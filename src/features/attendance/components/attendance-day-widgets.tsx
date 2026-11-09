import type { AttendanceOverview } from '../attendance.types'
import { cn } from '#/lib/utils'
import { AttendanceScheduleWidget } from './attendance-schedule-widget'
import { AttendanceWeeklyWidget } from './attendance-weekly-widget'

export function AttendanceDayWidgets({
  overview,
  compact = false,
}: {
  overview: AttendanceOverview
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        compact ? 'contents' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-1',
      )}
    >
      <AttendanceScheduleWidget
        workday={overview.workday}
        approvedLeave={overview.approvedLeave}
        compact={compact}
      />
      <AttendanceWeeklyWidget
        key={overview.serverNow}
        overview={overview}
        compact={compact}
      />
    </div>
  )
}
