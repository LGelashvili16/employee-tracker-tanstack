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
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { attendanceOptions } from '../attendance.queries'
import { AttendanceClock } from './attendance-clock'
import { AttendanceDayWidgets } from './attendance-day-widgets'
import { RecentAttendance } from './recent-attendance'
import { CurrentDayWidget } from './current-day-widget'
import { DailyGoalWidget } from './daily-goal-widget'
import { cn } from '#/lib/utils'
import { TimeGreeting } from '#/components/common/time-greeting'
import { AttendanceScheduleWidget } from './attendance-schedule-widget'
import { AttendanceWeeklyWidget } from './attendance-weekly-widget'

// Share row heights across the compact widgets, with the clock spanning both rows.
const dashboardGrid = 'sm:grid-cols-2 xl:auto-rows-fr xl:grid-cols-4'
const dashboardClock = 'sm:col-span-2 xl:row-span-2'
const dashboardSummary = 'min-w-0'

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
      <div role="status" aria-busy="true" aria-label="დასწრება იტვირთება">
        {heading ? <div className="mb-6">{heading}</div> : null}
        <div aria-hidden="true" className="flex flex-col gap-4">
          <div
            className={cn(
              'grid gap-4',
              dashboardLayout ? dashboardGrid : 'xl:grid-cols-3',
            )}
          >
            <Skeleton
              className={cn(
                'h-96 rounded-2xl xl:h-full',
                dashboardLayout ? dashboardClock : 'xl:col-span-2',
              )}
            />
            {dashboardLayout ? (
              <>
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton
                  className={cn('h-64 rounded-2xl', dashboardSummary)}
                />
                <Skeleton
                  className={cn('h-64 rounded-2xl', dashboardSummary)}
                />
              </>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <Skeleton className="h-56 rounded-2xl" />
                <Skeleton className="h-60 rounded-2xl" />
              </div>
            )}
          </div>
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
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
        className="flex flex-col gap-4"
      >
        {heading ? <div className="mb-2">{heading}</div> : null}
        <div
          className={cn(
            'grid gap-4',
            dashboardLayout ? dashboardGrid : 'xl:grid-cols-3',
          )}
        >
          <div
            className={cn(
              'min-w-0',
              dashboardLayout ? dashboardClock : 'xl:col-span-2',
            )}
          >
            <AttendanceClock
              overview={result.value}
              actorId={actorId}
              compact={dashboardLayout}
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
          ) : (
            <div className="min-w-0">
              <AttendanceDayWidgets overview={result.value} />
            </div>
          )}
        </div>
        <RecentAttendance overview={result.value} />
      </motion.div>
    </MotionConfig>
  )
}
