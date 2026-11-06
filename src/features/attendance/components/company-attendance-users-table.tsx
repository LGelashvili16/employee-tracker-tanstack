import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { IconArrowsSort } from '@tabler/icons-react'
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
  const sort = search.sort ?? 'name-asc'
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('name', {
          header: () => (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              role="link"
              render={
                <Link
                  to="/admin/attendance"
                  search={{
                    ...search,
                    page: 1,
                    sort: sort === 'name-asc' ? 'name-desc' : 'name-asc',
                  }}
                />
              }
            >
              თანამშრომელი
              <IconArrowsSort data-icon="inline-end" aria-hidden="true" />
            </Button>
          ),
          cell: ({ row }) => (
            <Link
              className="font-medium underline underline-offset-4"
              to="/admin/attendance/$userId"
              params={{ userId: row.original.userId }}
            >
              {row.original.name}
            </Link>
          ),
        }),
        helper.accessor('code', {
          header: () => (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              role="link"
              render={
                <Link
                  to="/admin/attendance"
                  search={{
                    ...search,
                    page: 1,
                    sort: sort === 'code-asc' ? 'code-desc' : 'code-asc',
                  }}
                />
              }
            >
              კოდი
              <IconArrowsSort data-icon="inline-end" aria-hidden="true" />
            </Button>
          ),
          cell: ({ row }) => row.original.code || 'არ არის მითითებული',
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
                    : 'secondary'
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
        helper.accessor('sessionCount', { header: 'სესიების რაოდენობა' }),
        helper.display({
          id: 'details',
          header: 'დასწრება',
          cell: ({ row }) => (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              role="link"
              render={
                <Link
                  to="/admin/attendance/$userId"
                  params={{ userId: row.original.userId }}
                  aria-label={`სესიების ნახვა: ${row.original.name}`}
                />
              }
            >
              სესიების ნახვა
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
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
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
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
