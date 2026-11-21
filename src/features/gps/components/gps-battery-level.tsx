import { cn } from '#/lib/utils'

export function gpsBatteryTone(percent: number | null) {
  if (percent === null) return 'text-muted-foreground'
  if (percent <= 20) return 'text-badge-red-foreground'
  if (percent <= 50) return 'text-badge-yellow-foreground'
  return 'text-badge-green-foreground'
}

export function GpsBatteryLevel({ percent }: { percent: number | null }) {
  const color = gpsBatteryTone(percent)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-medium tabular-nums',
        color,
      )}
    >
      <span aria-hidden="true" className="inline-flex shrink-0 items-center">
        <span className="block h-4 w-8 rounded-[0.3rem] border border-current p-0.5">
          <span
            className="block h-full rounded-[0.12rem] bg-current"
            style={{ width: `${percent ?? 0}%` }}
          />
        </span>
        <span className="h-1.5 w-0.5 rounded-r-sm bg-current" />
      </span>
      {percent === null ? 'უცნობია' : `${percent}%`}
    </span>
  )
}
