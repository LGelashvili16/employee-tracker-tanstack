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

export function AttendanceOverview({ actorId }: { actorId: string }) {
  // Keep this employee cache scoped to the mounted private page, including across account changes.
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <OverviewContent actorId={actorId} />
    </QueryClientProvider>
  )
}

function OverviewContent({ actorId }: { actorId: string }) {
  const query = useQuery(attendanceOptions(actorId))
  const reducedMotion = useReducedMotion()
  if (query.isPending)
    return (
      <div role="status" aria-busy="true" aria-label="დასწრება იტვირთება">
        <div aria-hidden="true" className="flex flex-col gap-4">
          <div className="grid gap-4 xl:grid-cols-3">
            <Skeleton className="h-96 rounded-2xl xl:col-span-2 xl:h-full" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Skeleton className="h-56 rounded-2xl" />
              <Skeleton className="h-60 rounded-2xl" />
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
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <AttendanceClock overview={result.value} actorId={actorId} />
          </div>
          <AttendanceDayWidgets overview={result.value} />
        </div>
        <RecentAttendance overview={result.value} />
      </motion.div>
    </MotionConfig>
  )
}
