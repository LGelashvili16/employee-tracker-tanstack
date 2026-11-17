import type { ReactNode } from 'react'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'

export const dashboardGrid = 'sm:grid-cols-2 xl:auto-rows-fr xl:grid-cols-4'
export const dashboardClock = 'sm:col-span-2 xl:row-span-2'
export const dashboardSummary = 'min-w-0'

export function AttendanceOverviewSkeleton({
  dashboardLayout = false,
  heading,
  announce = true,
}: {
  dashboardLayout?: boolean
  heading?: ReactNode
  announce?: boolean
}) {
  return (
    <div
      role={announce ? 'status' : undefined}
      aria-busy={announce || undefined}
      aria-label={announce ? 'დასწრება იტვირთება' : undefined}
    >
      {heading ? (
        <div className="mb-6">{heading}</div>
      ) : dashboardLayout ? (
        <div aria-hidden="true" className="mb-6 flex justify-center">
          <Skeleton className="h-8 w-72 max-w-full sm:h-9" />
        </div>
      ) : null}
      <div aria-hidden="true" className="flex flex-col gap-4">
        <div className={cn('grid gap-4', dashboardLayout ? dashboardGrid : '')}>
          <Skeleton
            className={cn(
              dashboardLayout
                ? 'h-96 rounded-2xl xl:h-full'
                : 'h-80 rounded-2xl lg:h-44',
              dashboardLayout ? dashboardClock : '',
            )}
          />
          {dashboardLayout ? (
            <>
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className={cn('h-64 rounded-2xl', dashboardSummary)} />
              <Skeleton className={cn('h-64 rounded-2xl', dashboardSummary)} />
            </>
          ) : null}
        </div>
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    </div>
  )
}
