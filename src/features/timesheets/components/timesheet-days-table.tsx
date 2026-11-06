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
import {
  formatAttendanceLocalInput,
  formatWorkedTime,
} from '#/features/attendance/attendance.rules'
import type { TimesheetDay } from '../timesheets.types'

type Row = TimesheetDay & { team: boolean; company?: boolean; month: string }
const features = tableFeatures({})
const helper = createColumnHelper<typeof features, Row>()
const columns = helper.columns([
  helper.accessor('employeeName', {
    header: 'თანამშრომელი',
    cell: ({ row }) =>
      row.original.company && row.original.userId ? (
        <Link
          className="underline underline-offset-4"
          to="/admin/timesheets"
          search={{ month: row.original.month, userId: row.original.userId }}
        >
          {row.original.employeeName}
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
  helper.accessor('date', { header: 'სამუშაო დღე' }),
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
    header: 'აღრიცხული დრო',
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

export function TimesheetDaysTable({ rows }: { rows: Array<Row> }) {
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => `${row.employeeId}-${row.date}-${row.timezone}`,
  })
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id}>
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
