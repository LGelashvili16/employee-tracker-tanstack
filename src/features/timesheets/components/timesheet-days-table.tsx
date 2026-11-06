import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Badge } from '#/components/ui/badge'
import { TimesheetSortTitle } from './timesheet-sort-title'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import {
  formatAttendanceLocalInput,
  formatWorkedTime,
} from '#/features/attendance/attendance.rules'
import type { TimesheetDay, TimesheetSearch } from '../timesheets.types'

type Row = TimesheetDay & { team: boolean; company?: boolean; month: string }
const features = tableFeatures({})
const helper = createColumnHelper<typeof features, Row>()
const makeColumns = (search?: TimesheetSearch) =>
  helper.columns([
    helper.accessor('employeeName', {
      header: () => (
        <TimesheetSortTitle
          label="თანამშრომელი"
          column="name"
          search={search}
        />
      ),
      cell: ({ row }) =>
        row.original.company && row.original.userId ? (
          <Link
            className="group flex min-w-44 items-center gap-3 rounded-md font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
            to="/admin/timesheets"
            search={{ month: row.original.month, userId: row.original.userId }}
          >
            <Avatar aria-hidden="true">
              <AvatarFallback>
                {row.original.employeeName
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <span className="group-hover:underline group-hover:underline-offset-4">
              {row.original.employeeName}
            </span>
          </Link>
        ) : row.original.team && row.original.userId ? (
          <Link
            className="underline underline-offset-4"
            to="/manage/timesheets/$timesheetId"
            params={{ timesheetId: row.original.userId }}
            search={{ month: row.original.month }}
          >
            {row.original.employeeName}
          </Link>
        ) : (
          row.original.employeeName
        ),
    }),
    helper.accessor('date', {
      header: () => (
        <TimesheetSortTitle label="სამუშაო დღე" column="date" search={search} />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span>{row.original.date}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.timezone}
          </span>
        </div>
      ),
    }),
    helper.accessor('firstIn', {
      header: 'პირველი შესვლა',
      cell: ({ row }) =>
        formatAttendanceLocalInput(
          row.original.firstIn,
          row.original.timezone,
        ).replace('T', ' '),
    }),
    helper.accessor('lastOut', {
      header: 'ბოლო გასვლა',
      cell: ({ row }) =>
        row.original.lastOut
          ? formatAttendanceLocalInput(
              row.original.lastOut,
              row.original.timezone,
            ).replace('T', ' ')
          : 'მიმდინარე',
    }),
    helper.accessor('seconds', {
      header: () => (
        <TimesheetSortTitle
          label="აღრიცხული დრო"
          column="seconds"
          search={search}
        />
      ),
      cell: ({ row }) => formatWorkedTime(row.original.seconds),
    }),
    helper.accessor('approvedOutsideSeconds', {
      header: 'დამტკიცებული დამატებითი დრო',
      cell: ({ row }) => formatWorkedTime(row.original.approvedOutsideSeconds),
    }),
    helper.display({
      id: 'status',
      header: 'სტატუსი',
      cell: ({ row }) => {
        const day = row.original
        return (
          <div className="flex flex-wrap gap-1">
            {day.open > 0 ? (
              <Badge variant="yellow">მიმდინარე ჩანაწერი</Badge>
            ) : null}
            {day.pending > 0 ? (
              <Badge variant="yellow">განხილვის მოლოდინში: {day.pending}</Badge>
            ) : null}
            {day.rejected > 0 ? (
              <Badge variant="red">უარყოფილი: {day.rejected}</Badge>
            ) : null}
            {day.open === 0 && day.pending === 0 && day.rejected === 0 ? (
              <Badge variant="green">დადასტურებული</Badge>
            ) : null}
          </div>
        )
      },
    }),
  ])

export function TimesheetDaysTable({
  rows,
  search,
}: {
  rows: Array<Row>
  search?: TimesheetSearch
}) {
  const columns = useMemo(() => makeColumns(search), [search])
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => `${row.employeeId}-${row.date}-${row.timezone}`,
  })
  return (
    <Table className="min-w-[64rem]">
      <TableHeader className="bg-muted/40">
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                className={
                  header.column.id === 'seconds' ||
                  header.column.id === 'approvedOutsideSeconds'
                    ? 'h-12 px-4 text-right'
                    : 'h-12 px-4'
                }
                aria-sort={
                  search &&
                  (search.sort ?? 'date-desc').startsWith(
                    header.column.id === 'employeeName'
                      ? 'name'
                      : header.column.id,
                  )
                    ? (search.sort ?? 'date-desc').endsWith('desc')
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
                  cell.column.id === 'seconds' ||
                  cell.column.id === 'approvedOutsideSeconds'
                    ? 'px-4 py-4 text-right tabular-nums'
                    : 'px-4 py-4 tabular-nums'
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
