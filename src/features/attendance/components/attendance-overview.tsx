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

export function AttendanceOverview({
  actorId,
  dashboardLayout = false,
}: {
  actorId: string
  dashboardLayout?: boolean
}) {
  // Keep this employee cache scoped to the mounted private page, including across account changes.
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <OverviewContent actorId={actorId} dashboardLayout={dashboardLayout} />
    </QueryClientProvider>
  )
}

function OverviewContent({
  actorId,
  dashboardLayout,
}: {
  actorId: string
  dashboardLayout: boolean
}) {
  const query = useQuery(attendanceOptions(actorId))
  const reducedMotion = useReducedMotion()
  if (query.isPending)
    return (
      <div role="status" aria-busy="true" aria-label="დასწრება იტვირთება">
        <div aria-hidden="true" className="flex flex-col gap-4">
          <div
            className={cn(
              'grid gap-4',
              dashboardLayout ? 'xl:grid-cols-2' : 'xl:grid-cols-3',
            )}
          >
            <Skeleton
              className={cn(
                'h-96 rounded-2xl xl:h-full',
                !dashboardLayout && 'xl:col-span-2',
              )}
            />
            <div className="@container min-w-0">
              <div
                className={cn(
                  'grid gap-4',
                  dashboardLayout
                    ? '@md:grid-cols-2'
                    : 'sm:grid-cols-2 xl:grid-cols-1',
                )}
              >
                {dashboardLayout ? (
                  <Skeleton className="h-56 rounded-2xl" />
                ) : null}
                <Skeleton
                  className={cn(
                    'rounded-2xl',
                    dashboardLayout ? 'h-48' : 'h-56',
                  )}
                />
                {dashboardLayout ? (
                  <Skeleton className="h-48 rounded-2xl" />
                ) : null}
                <Skeleton
                  className={cn(
                    'rounded-2xl',
                    dashboardLayout ? 'h-48' : 'h-60',
                  )}
                />
              </div>
            </div>
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
        <div
          className={cn(
            'grid gap-4',
            dashboardLayout ? 'xl:grid-cols-2' : 'xl:grid-cols-3',
          )}
        >
          <div className={cn('min-w-0', !dashboardLayout && 'xl:col-span-2')}>
            <AttendanceClock
              overview={result.value}
              actorId={actorId}
              compact={dashboardLayout}
            />
          </div>
          <div className="@container min-w-0">
            <div
              className={cn(
                dashboardLayout ? 'grid gap-4 @md:grid-cols-2' : 'contents',
              )}
            >
              {dashboardLayout ? (
                <CurrentDayWidget
                  date={result.value.workday.date}
                  timezone={result.value.workday.timezone}
                />
              ) : null}
              <AttendanceDayWidgets
                overview={result.value}
                compact={dashboardLayout}
              />
              {dashboardLayout ? (
                <DailyGoalWidget
                  key={result.value.serverNow}
                  overview={result.value}
                />
              ) : null}
            </div>
          </div>
        </div>
        <RecentAttendance overview={result.value} />
      </motion.div>
    </MotionConfig>
  )
}
