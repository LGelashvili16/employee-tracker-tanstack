import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { cn } from '#/lib/utils'

function Progress({ className, ...props }: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('w-full', className)}
      locale="ka-GE"
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="rounded-full bg-primary"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
