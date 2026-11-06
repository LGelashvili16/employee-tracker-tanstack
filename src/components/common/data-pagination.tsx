import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '#/components/ui/pagination'
import type { ReactElement } from 'react'

export function DataPagination({
  page,
  total,
  pageSize,
  renderLink,
}: {
  page: number
  total: number
  pageSize: number
  renderLink: (page: number) => ReactElement
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const visible = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((value) => value >= 1 && value <= pages)
    .sort((a, b) => a - b)
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        სულ: {total}. გვერდი {page} / {pages}
      </p>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            {page > 1 ? (
              <PaginationPrevious render={renderLink(page - 1)} />
            ) : (
              <PaginationPrevious
                role="link"
                aria-disabled="true"
                tabIndex={-1}
                className="pointer-events-none opacity-50"
              />
            )}
          </PaginationItem>
          {visible.map((value, index) => (
            <PaginationItem key={value} className="flex items-center gap-1">
              {index > 0 && value - visible[index - 1] > 1 ? (
                <PaginationEllipsis />
              ) : null}
              <PaginationLink
                isActive={value === page}
                aria-label={`გვერდი ${value}`}
                render={renderLink(value)}
              >
                {value}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            {page < pages ? (
              <PaginationNext render={renderLink(page + 1)} />
            ) : (
              <PaginationNext
                role="link"
                aria-disabled="true"
                tabIndex={-1}
                className="pointer-events-none opacity-50"
              />
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
