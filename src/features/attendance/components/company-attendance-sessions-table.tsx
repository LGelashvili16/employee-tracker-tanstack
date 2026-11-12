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
  needsSessionReview,
} from '../attendance.rules'
import type { CompanyAttendanceSession } from '../company-attendance.types'
import { AttendanceDeviationBadges } from './attendance-deviation-badges'
import { AttendanceReviewDialog } from './attendance-review-dialog'
import { useMemo } from 'react'

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
            corrected={Boolean(
              (item.originalStartedAt &&
                item.originalStartedAt !== item.startedAt) ||
              (item.endedAt && item.originalEndedAt !== item.endedAt),
            )}
            {...metrics}
            lateSeconds={item.isFirstOfDay ? metrics.lateSeconds : 0}
            earlyStartSeconds={
              item.isFirstOfDay ? metrics.earlyStartSeconds : 0
            }
            earlySeconds={item.isLastOfDay ? metrics.earlySeconds : 0}
            approvedOutsideSeconds={item.approvedOutsideSeconds}
          />
          {!item.endedAt &&
          needsSessionReview(
            item.startedAt,
            item.serverNow,
            item.maxOpenHours,
          ) ? (
            <Badge variant="red">ხანგრძლივი ჩანაწერი გადასამოწმებელია</Badge>
          ) : null}
        </div>
      )
    },
  }),
  helper.display({
    id: 'schedule',
    header: 'დაგეგმილი განრიგი',
    cell: ({ row }) => {
      const { expectedStartAt, expectedEndAt, timezone } = row.original
      if (expectedStartAt === expectedEndAt)
        return <Badge variant="secondary">არასამუშაო დღე</Badge>
      const start = formatAttendanceLocalInput(expectedStartAt, timezone)
      const end = formatAttendanceLocalInput(expectedEndAt, timezone)
      const overnight = start.slice(0, 10) !== end.slice(0, 10)
      return (
        <span className="whitespace-nowrap tabular-nums">
          <time dateTime={expectedStartAt}>{start.slice(11)}</time>
          {' - '}
          <time dateTime={expectedEndAt}>
            {overnight ? end.replace('T', ' ') : end.slice(11)}
          </time>
        </span>
      )
    },
  }),
  helper.display({
    id: 'actions',
    header: 'მოქმედებები',
    cell: ({ row }) => <AttendanceReviewDialog session={row.original} />,
  }),
])
export function CompanyAttendanceSessionsTable({ rows }: { rows: Array<Row> }) {
  const visibleColumns = useMemo(
    () =>
      rows.some((row) => row.canReview || row.canCorrect)
        ? columns
        : columns.filter((column) => column.id !== 'actions'),
    [rows],
  )
  const table = useTable({
    features,
    columns: visibleColumns,
    data: rows,
    getRowId: (row) => row.id,
  })
  return (
    <Table className="min-w-[48rem]">
      <TableHeader className="bg-muted/40">
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id} className="h-12 px-4">
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
              <TableCell key={cell.id} className="px-4 py-4">
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
