import { Link } from '@tanstack/react-router'
import { IconArrowDown, IconArrowUp, IconArrowsSort } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import type { TimesheetSearch } from '../timesheets.types'

export function TimesheetSortTitle({
  label,
  column,
  search,
}: {
  label: string
  column: 'name' | 'date' | 'seconds'
  search?: TimesheetSearch
}) {
  if (!search) return label
  const sort = search.sort ?? 'date-desc'
  const active = sort.startsWith(column)
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
      render={
        <Link
          to="/admin/timesheets"
          search={{ ...search, sort: next, page: 0 }}
        />
      }
    >
      {label}
      {active ? (
        sort.endsWith('desc') ? (
          <IconArrowDown aria-hidden="true" />
        ) : (
          <IconArrowUp aria-hidden="true" />
        )
      ) : (
        <IconArrowsSort aria-hidden="true" />
      )}
    </Button>
  )
}
