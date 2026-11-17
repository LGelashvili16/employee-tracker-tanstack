import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils'

function Empty({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex min-w-0 flex-col items-center justify-center gap-6 p-6 text-center md:p-12',
        className,
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-sm flex-col items-center gap-2', className)}
      {...props}
    />
  )
}

function EmptyMedia({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-media"
      className={cn(
        'mb-2 flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground [&_svg]:size-6',
        className,
      )}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="empty-title"
      className={cn('text-base font-medium tracking-tight', className)}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        'flex w-full max-w-sm flex-col items-center gap-4 text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyContent }
