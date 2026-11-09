import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import {
  IconArrowsSort,
  IconChevronRight,
  IconArrowUp,
  IconArrowDown,
} from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type {
  CompanyAttendanceAccount,
  CompanyAttendanceSearch,
} from '../company-attendance.types'

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, CompanyAttendanceAccount>()
export function CompanyAttendanceUsersTable({
  items,
  search,
}: {
  items: Array<CompanyAttendanceAccount>
  search: CompanyAttendanceSearch
}) {
  const sort = (search.sort ?? 'name-asc').replace('code-', 'username-')
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('name', {
          header: () => (
            <Button
              variant="link"
              size="sm"
              nativeButton={false}
              role="link"
              render={
                <Link
                  to="/manage/attendance"
                  search={{
                    ...search,
                    page: 1,
                    sort: sort === 'name-asc' ? 'name-desc' : 'name-asc',
                  }}
                />
              }
            >
              თანამშრომელი
              {sort.startsWith('name') ? (
                sort.endsWith('desc') ? (
                  <IconArrowDown data-icon="inline-end" aria-hidden="true" />
                ) : (
                  <IconArrowUp data-icon="inline-end" aria-hidden="true" />
                )
              ) : (
                <IconArrowsSort data-icon="inline-end" aria-hidden="true" />
              )}
            </Button>
          ),
          cell: ({ row }) => (
            <Link
              className="group flex min-w-48 items-center gap-3 rounded-md font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
              to="/manage/attendance/$userId"
              params={{ userId: row.original.userId }}
            >
              <Avatar aria-hidden="true">
                <AvatarFallback>
                  {row.original.name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toLocaleUpperCase('ka-GE')}
                </AvatarFallback>
              </Avatar>
              <span className="group-hover:underline group-hover:underline-offset-4">
                {row.original.name}
              </span>
            </Link>
          ),
        }),
        helper.accessor('username', {
          header: () => (
            <Button
              variant="link"
              size="sm"
              nativeButton={false}
              role="link"
              render={
                <Link
                  to="/manage/attendance"
                  search={{
                    ...search,
                    page: 1,
                    sort:
                      sort === 'username-asc'
                        ? 'username-desc'
                        : 'username-asc',
                  }}
                />
              }
            >
              მომხმარებლის სახელი
              {sort.startsWith('username') ? (
                sort.endsWith('desc') ? (
                  <IconArrowDown data-icon="inline-end" aria-hidden="true" />
                ) : (
                  <IconArrowUp data-icon="inline-end" aria-hidden="true" />
                )
              ) : (
                <IconArrowsSort data-icon="inline-end" aria-hidden="true" />
              )}
            </Button>
          ),
          cell: ({ row }) => (
            <span className="font-mono text-sm text-muted-foreground">
              {row.original.username || 'არ არის მითითებული'}
            </span>
          ),
        }),
        helper.accessor('state', {
          header: 'ანგარიშის სტატუსი',
          cell: ({ row }) => (
            <Badge
              variant={
                row.original.state === 'active'
                  ? 'green'
                  : row.original.state === 'suspended'
                    ? 'red'
                    : 'yellow'
              }
            >
              {row.original.state === 'active'
                ? 'აქტიური'
                : row.original.state === 'suspended'
                  ? 'შეჩერებული'
                  : 'გასააქტიურებელი'}
            </Badge>
          ),
        }),
        helper.accessor('sessionCount', {
          header: 'სესიები',
          cell: ({ row }) => (
            <span className="block text-right tabular-nums">
              {row.original.sessionCount}
            </span>
          ),
        }),
        helper.display({
          id: 'details',
          header: 'დასწრება',
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              role="link"
              render={
                <Link
                  to="/manage/attendance/$userId"
                  params={{ userId: row.original.userId }}
                  aria-label={`სესიების ნახვა: ${row.original.name}`}
                />
              }
            >
              <IconChevronRight aria-hidden="true" />
            </Button>
          ),
        }),
      ]),
    [search, sort],
  )
  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (row) => row.userId,
  })
  return (
    <Table className="min-w-[42rem]">
      <TableHeader className="bg-muted/40">
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                className={
                  header.column.id === 'sessionCount' ||
                  header.column.id === 'details'
                    ? 'h-12 px-4 text-right'
                    : 'h-12 px-4'
                }
                aria-sort={
                  sort.startsWith(header.column.id)
                    ? sort.endsWith('desc')
                      ? 'descending'
                      : 'ascending'
                    : undefined
                }
              >
                <table.FlexRender header={header} />
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={
                  cell.column.id === 'details'
                    ? 'px-4 py-4 text-right'
                    : 'px-4 py-4'
                }
              >
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
