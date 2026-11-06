import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  formatAttendanceLocalInput,
  formatWorkedTime,
  sessionMetrics,
} from '../attendance.rules'
import type { CompanyAttendanceSession } from '../company-attendance.types'
import { AttendanceDeviationBadges } from './attendance-deviation-badges'

type Row = CompanyAttendanceSession & { serverNow: string }
const features = tableFeatures({})
const helper = createColumnHelper<typeof features, Row>()
const columns = helper.columns([
  helper.accessor('startedAt', {
    header: 'შესვლა',
    cell: ({ row }) =>
      formatAttendanceLocalInput(
        row.original.startedAt,
        row.original.timezone,
      ).replace('T', ' '),
  }),
  helper.accessor('endedAt', {
    header: 'გასვლა',
    cell: ({ row }) =>
      row.original.endedAt
        ? formatAttendanceLocalInput(
            row.original.endedAt,
            row.original.timezone,
          ).replace('T', ' ')
        : 'მიმდინარე',
  }),
  helper.display({
    id: 'duration',
    header: 'აღრიცხული დრო',
    cell: ({ row }) =>
      formatWorkedTime(
        sessionMetrics(
          row.original.startedAt,
          row.original.endedAt,
          row.original.expectedStartAt,
          row.original.expectedEndAt,
          row.original.serverNow,
        ).seconds,
      ),
  }),
  helper.accessor('reviewState', {
    header: 'სტატუსი',
    cell: ({ row }) => {
      const item = row.original
      const metrics = sessionMetrics(
        item.startedAt,
        item.endedAt,
        item.expectedStartAt,
        item.expectedEndAt,
        item.serverNow,
      )
      return (
        <div className="flex min-w-48 flex-col gap-2">
          <Badge
            variant={
              row.original.reviewState === 'approved'
                ? 'green'
                : row.original.reviewState === 'rejected'
                  ? 'red'
                  : 'yellow'
            }
          >
            {row.original.reviewState === 'approved'
              ? 'დადასტურებული'
              : row.original.reviewState === 'rejected'
                ? 'უარყოფილი'
                : 'განხილვის მოლოდინში'}
          </Badge>
          <AttendanceDeviationBadges
            {...metrics}
            lateSeconds={item.isFirstOfDay ? metrics.lateSeconds : 0}
            earlyStartSeconds={
              item.isFirstOfDay ? metrics.earlyStartSeconds : 0
            }
            earlySeconds={item.isLastOfDay ? metrics.earlySeconds : 0}
            approvedOutsideSeconds={item.approvedOutsideSeconds}
          />
        </div>
      )
    },
  }),
  helper.accessor('timezone', { header: 'დროის სარტყელი' }),
])
export function CompanyAttendanceSessionsTable({ rows }: { rows: Array<Row> }) {
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => row.id,
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
