import { useMemo } from 'react'
import type { ReactElement } from 'react'
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
import { Button } from '#/components/ui/button'
import { IconChevronRight } from '@tabler/icons-react'
import { TimesheetSortTitle } from './timesheet-sort-title'
import {
  formatAttendanceDateTime,
  formatAttendanceTime,
  formatWorkedTime,
} from '#/features/attendance/attendance.rules'
import type { TimesheetDay, TimesheetSearch } from '../timesheets.types'
import { formatAttendanceDate } from '#/features/attendance/attendance.presentation'
import { companyLocalDate } from '#/features/scheduling/scheduling.rules'
import { cn } from '#/lib/utils'

function TimesheetTime({ value, day }: { value: string; day: TimesheetDay }) {
  const date = companyLocalDate(new Date(value), day.timezone)
  return (
    <div className="flex flex-col gap-1">
      <time dateTime={value}>{formatAttendanceTime(value, day.timezone)}</time>
      {date !== day.date ? (
        <span className="text-xs text-muted-foreground">
          {formatAttendanceDate(date, true)}
        </span>
      ) : null}
    </div>
  )
}

type Row = TimesheetDay & { month: string }
const features = tableFeatures({})
const helper = createColumnHelper<typeof features, Row>()
const makeColumns = (
  search?: TimesheetSearch,
  renderLink?: (search: TimesheetSearch) => ReactElement,
  compact = false,
  onOpenDay?: (date: string) => void,
) =>
  helper.columns([
    helper.accessor('employeeName', {
      header: () => (
        <TimesheetSortTitle
          label="თანამშრომელი"
          column="name"
          search={search}
          renderLink={renderLink}
        />
      ),
      cell: ({ row }) => row.original.employeeName,
    }),
    helper.accessor('date', {
      header: () => (
        <TimesheetSortTitle
          label="სამუშაო დღე"
          column="date"
          search={search}
          renderLink={renderLink}
        />
      ),
      cell: ({ row }) => (
        <time dateTime={row.original.date}>
          {compact
            ? formatAttendanceDate(row.original.date, true)
            : row.original.date}
        </time>
      ),
    }),
    helper.accessor('firstIn', {
      header: 'პირველი შესვლა',
      cell: ({ row }) =>
        compact ? (
          <TimesheetTime value={row.original.firstIn} day={row.original} />
        ) : (
          formatAttendanceDateTime(row.original.firstIn, row.original.timezone)
        ),
    }),
    helper.accessor('lastOut', {
      header: 'ბოლო გასვლა',
      cell: ({ row }) =>
        row.original.lastOut ? (
          compact ? (
            <TimesheetTime value={row.original.lastOut} day={row.original} />
          ) : (
            formatAttendanceDateTime(
              row.original.lastOut,
              row.original.timezone,
            )
          )
        ) : (
          'მიმდინარე'
        ),
    }),
    helper.accessor('seconds', {
      header: () => (
        <TimesheetSortTitle
          label="აღრიცხული დრო"
          column="seconds"
          search={search}
          renderLink={renderLink}
        />
      ),
      cell: ({ row }) => formatWorkedTime(row.original.seconds),
    }),
    helper.accessor('approvedOutsideSeconds', {
      header: () => (
        <span className="whitespace-nowrap">
          დამტკიცებული
          <br />
          დამატებითი დრო
        </span>
      ),
      cell: ({ row }) => formatWorkedTime(row.original.approvedOutsideSeconds),
    }),
    helper.display({
      id: 'status',
      header: 'სტატუსი',
      cell: ({ row }) => {
        const day = row.original
        return (
          <div className="flex max-w-64 min-w-40 flex-wrap gap-1">
            {day.corrected ? (
              <Badge variant="secondary">შესწორებულია</Badge>
            ) : null}
            {day.open > 0 ? (
              <Badge variant="yellow">მიმდინარე ჩანაწერი</Badge>
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
    ...(onOpenDay
      ? [
          helper.display({
            id: 'sessions',
            header: 'სესიები',
            cell: ({ row }) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenDay(row.original.date)}
                aria-label={`${row.original.date} სესიების ნახვა`}
              >
                სესიები
                <IconChevronRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            ),
          }),
        ]
      : []),
  ])

export function TimesheetDaysTable({
  rows,
  search,
  renderLink,
  hideEmployee = false,
  onOpenDay,
}: {
  rows: Array<Row>
  search?: TimesheetSearch
  renderLink?: (search: TimesheetSearch) => ReactElement
  hideEmployee?: boolean
  onOpenDay?: (date: string) => void
}) {
  const columns = useMemo(() => {
    const result = makeColumns(search, renderLink, hideEmployee, onOpenDay)
    return hideEmployee ? result.slice(1) : result
  }, [search, renderLink, hideEmployee, onOpenDay])
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => `${row.employeeId}-${row.date}-${row.timezone}`,
  })
  return (
    <Table className={hideEmployee ? 'min-w-[48rem]' : 'min-w-[64rem]'}>
      <TableHeader className="bg-muted/40">
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(
                  'whitespace-normal',
                  (header.column.id === 'firstIn' ||
                    header.column.id === 'lastOut') &&
                    'min-w-28',
                  header.column.id === 'seconds' ||
                    header.column.id === 'approvedOutsideSeconds'
                    ? 'h-12 px-4 text-right'
                    : 'h-12 px-4',
                )}
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
