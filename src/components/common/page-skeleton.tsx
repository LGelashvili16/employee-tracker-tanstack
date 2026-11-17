import { Skeleton } from '#/components/ui/skeleton'

/** A shared layout fallback; data-heavy features should supply a skeleton matching their own layout. */
export function PageSkeleton({ announce = true }: { announce?: boolean }) {
  return (
    <div
      role={announce ? 'status' : undefined}
      aria-busy={announce || undefined}
      aria-label={announce ? 'გვერდი იტვირთება' : undefined}
      className="flex flex-col gap-6 p-4"
    >
      <span className="sr-only">გვერდი იტვირთება…</span>
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton aria-hidden="true" className="h-64 w-full rounded-xl" />
    </div>
  )
}
