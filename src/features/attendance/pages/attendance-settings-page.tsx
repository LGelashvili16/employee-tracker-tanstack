import { useState } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { IconRefresh } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { scheduleSettingsOptions } from '#/features/scheduling/scheduling.queries'
import { ScheduleVersionForm } from '#/features/scheduling/components/schedule-version-form'
import { attendanceContent } from '../attendance.content'
import { AttendanceConfiguration } from '../components/attendance-configuration'

export function AttendanceSettingsPage({ actorId }: { actorId: string }) {
  // Match the existing private feature cache ownership; remount on identity changes.
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <SettingsContent actorId={actorId} />
    </QueryClientProvider>
  )
}

function SettingsContent({ actorId }: { actorId: string }) {
  const query = useQuery(scheduleSettingsOptions(actorId))
  const result = query.data
  async function refreshSettings() {
    const response = await query.refetch().catch(() => null)
    if (response && !response.isError && response.data?.ok) {
      toast.success('მონაცემები განახლებულია.')
    } else {
      toast.error(
        response?.data && !response.data.ok
          ? response.data.message
          : 'მონაცემების განახლება ვერ მოხერხდა. სცადეთ ხელახლა.',
      )
    }
  }
  return (
    <section className="flex w-full min-w-0 flex-col gap-7 pb-6">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {attendanceContent.attendanceSettings.title}
        </h1>
        {query.isError || result?.ok === false ? (
          <Button
            variant="outline"
            className="min-h-10"
            disabled={query.isFetching}
            aria-busy={query.isFetching}
            onClick={() => void refreshSettings()}
          >
            {query.isFetching ? (
              <Spinner aria-hidden="true" />
            ) : (
              <IconRefresh aria-hidden="true" />
            )}
            მონაცემების განახლება
          </Button>
        ) : null}
      </header>
      {query.isPending ? (
        <div role="status" aria-busy="true" aria-label="განრიგი იტვირთება">
          <div
            aria-hidden="true"
            className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]"
          >
            <Skeleton className="h-[38rem] w-full" />
            <div className="flex flex-col gap-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          </div>
        </div>
      ) : query.isError || !result?.ok ? (
        <Alert variant="destructive">
          <AlertDescription>
            {result && !result.ok
              ? result.message
              : 'განრიგის ჩატვირთვა ვერ მოხერხდა. გადაამოწმეთ თქვენი წვდომა.'}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {!result.value.current ? (
            <p className="text-sm text-muted-foreground">
              ამ დღისთვის მოქმედი განრიგი ჯერ არ არის განსაზღვრული.
            </p>
          ) : null}
          <ScheduleVersionForm
            key={`${result.value.latest?.effectiveFrom ?? 'new'}:${result.value.minimumEffectiveFrom}`}
            settings={result.value}
            actorId={actorId}
          />
          <AttendanceConfiguration actorId={actorId} />
        </>
      )}
    </section>
  )
}
