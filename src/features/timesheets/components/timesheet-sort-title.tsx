import { IconArrowsSort } from '@tabler/icons-react'
import type { ReactElement } from 'react'
import { Button } from '#/components/ui/button'
import type { TimesheetSearch } from '../timesheets.types'

export function TimesheetSortTitle({
  label,
  column,
  search,
  renderLink,
}: {
  label: string
  column: 'name' | 'date' | 'seconds'
  search?: TimesheetSearch
  renderLink?: (search: TimesheetSearch) => ReactElement
}) {
  if (!search || !renderLink) return label
  const sort = search.sort ?? 'date-desc'
  const next =
    column === 'name'
      ? sort === 'name-asc'
        ? 'name-desc'
        : 'name-asc'
      : column === 'date'
        ? sort === 'date-desc'
          ? 'date-asc'
          : 'date-desc'
        : sort === 'seconds-desc'
          ? 'seconds-asc'
          : 'seconds-desc'
  return (
    <Button
      variant="link"
      size="sm"
      nativeButton={false}
      role="link"
      render={renderLink({ ...search, sort: next, page: 0 })}
    >
      {label}
      <IconArrowsSort data-icon="inline-end" aria-hidden="true" />
    </Button>
  )
}
