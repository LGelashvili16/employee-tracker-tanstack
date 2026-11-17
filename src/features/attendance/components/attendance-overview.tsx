import { useState } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { MotionConfig, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { attendanceOptions } from '../attendance.queries'
import { AttendanceClock } from './attendance-clock'
import { RecentAttendance } from './recent-attendance'
import { useBusinessNotificationRefresh } from '#/hooks/use-business-notification-refresh'
import { CurrentDayWidget } from './current-day-widget'
import { DailyGoalWidget } from './daily-goal-widget'
import { cn } from '#/lib/utils'
import { TimeGreeting } from '#/components/common/time-greeting'
import { AttendanceScheduleWidget } from './attendance-schedule-widget'
import { AttendanceWeeklyWidget } from './attendance-weekly-widget'
import { ApprovedLeaveNotice } from './approved-leave-notice'

import {
  AttendanceOverviewSkeleton,
  dashboardGrid,
  dashboardClock,
  dashboardSummary,
} from './attendance-overview-skeleton'

export function AttendanceOverview({
  actorId,
  dashboardLayout = false,
  greetingName,
}: {
  actorId: string
  dashboardLayout?: boolean
  greetingName?: string
}) {
  // Keep this employee cache scoped to the mounted private page, including across account changes.
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <OverviewContent
        actorId={actorId}
        dashboardLayout={dashboardLayout}
        greetingName={greetingName}
      />
    </QueryClientProvider>
  )
}

function OverviewContent({
  actorId,
  dashboardLayout,
  greetingName,
}: {
  actorId: string
  dashboardLayout: boolean
  greetingName?: string
}) {
  const query = useQuery(attendanceOptions(actorId))
  useBusinessNotificationRefresh(actorId)
  const reducedMotion = useReducedMotion()
  const heading =
    greetingName === undefined ? null : (
      <TimeGreeting
        name={greetingName}
        clock={
          query.data?.ok
            ? {
                instant: query.data.value.serverNow,
                timezone: query.data.value.workday.timezone,
              }
            : undefined
        }
      />
    )
  if (query.isPending)
    return (
      <AttendanceOverviewSkeleton
        dashboardLayout={dashboardLayout}
        heading={heading}
      />
    )
  const result = query.data
  async function refresh() {
    const response = await query.refetch().catch(() => null)
    if (response?.data?.ok && !response.isError)
      toast.success('დასწრების მონაცემები განახლებულია.')
    else toast.error('დასწრების განახლება ვერ მოხერხდა. სცადეთ ხელახლა.')
  }
  if (query.isError || !result?.ok)
    return (
      <div className="flex flex-col items-start gap-4">
        {heading}
        <Alert variant="destructive">
          <AlertDescription>
            {result && !result.ok
              ? result.message
              : 'დასწრების ჩატვირთვა ვერ მოხერხდა. გადაამოწმეთ წვდომა.'}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          disabled={query.isFetching}
          aria-busy={query.isFetching}
          onClick={() => void refresh()}
        >
          <span className="flex size-4 items-center justify-center">
            {query.isFetching ? <Spinner aria-hidden="true" /> : null}
          </span>
          ხელახლა ცდა
        </Button>
      </div>
    )
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
        className={cn('flex flex-col', dashboardLayout ? 'gap-4' : 'gap-6')}
      >
        {heading ? <div className="mb-2">{heading}</div> : null}
        {result.value.approvedLeave ? (
          <ApprovedLeaveNotice leave={result.value.approvedLeave} />
        ) : null}
        <div className={cn('grid gap-4', dashboardLayout ? dashboardGrid : '')}>
          <div className={cn('min-w-0', dashboardLayout ? dashboardClock : '')}>
            <AttendanceClock
              overview={result.value}
              actorId={actorId}
              compact={dashboardLayout}
              workLog={!dashboardLayout}
            />
          </div>
          {dashboardLayout ? (
            <>
              <div className="min-w-0">
                <CurrentDayWidget
                  date={result.value.workday.date}
                  timezone={result.value.workday.timezone}
                />
              </div>
              <div className="min-w-0">
                <AttendanceScheduleWidget
                  workday={result.value.workday}
                  approvedLeave={result.value.approvedLeave}
                  compact
                />
              </div>
              <div className={dashboardSummary}>
                <AttendanceWeeklyWidget
                  key={result.value.serverNow}
                  overview={result.value}
                  compact
                />
              </div>
              <div className={dashboardSummary}>
                <DailyGoalWidget
                  key={result.value.serverNow}
                  overview={result.value}
                />
              </div>
            </>
          ) : null}
        </div>
        <RecentAttendance overview={result.value} workLog={!dashboardLayout} />
      </motion.div>
    </MotionConfig>
  )
}
