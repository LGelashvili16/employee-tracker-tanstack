import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import {
  IconChevronLeft,
  IconChevronRight,
  IconDots,
} from '@tabler/icons-react'
import { cn } from 'cn'
import { buttonVariants } from './button'
import type { ComponentProps } from 'react'

function Pagination({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      aria-label="გვერდები"
      data-slot="pagination"
      className={cn('flex justify-center', className)}
      {...props}
    />
  )
}
function PaginationContent({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-wrap items-center gap-1', className)}
      {...props}
    />
  )
}
function PaginationItem(props: ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}
function PaginationLink({
  className,
  isActive,
  render,
  ...props
}: useRender.ComponentProps<'a'> & { isActive?: boolean }) {
  return useRender({
    defaultTagName: 'a',
    render,
    props: mergeProps<'a'>(
      {
        'aria-current': isActive ? 'page' : undefined,
        className: cn(
          buttonVariants({
            variant: isActive ? 'outline' : 'ghost',
            size: 'icon',
          }),
          className,
        ),
      },
      props,
    ),
    state: { slot: 'pagination-link' },
  })
}
function PaginationPrevious(props: ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="წინა გვერდი" {...props}>
      <IconChevronLeft aria-hidden="true" />
    </PaginationLink>
  )
}
function PaginationNext(props: ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="შემდეგი გვერდი" {...props}>
      <IconChevronRight aria-hidden="true" />
    </PaginationLink>
  )
}
function PaginationEllipsis({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn('flex size-8 items-center justify-center', className)}
      {...props}
    >
      <IconDots className="size-4" />
    </span>
  )
}
export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
