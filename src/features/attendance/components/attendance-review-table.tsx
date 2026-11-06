import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'
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
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  readCompanyAttendance,
  readTeamAttendance,
} from '../attendance.functions'
import {
  formatAttendanceLocalInput,
  formatWorkedTime,
  needsSessionReview,
  sessionMetrics,
} from '../attendance.rules'
import { AttendanceDeviationBadges } from './attendance-deviation-badges'
import { AttendanceReviewDialog } from './attendance-review-dialog'
import type { ReviewSession } from '../attendance.types'

type ReviewRow = ReviewSession & { serverNow: string }
const features = tableFeatures({})
const helper = createColumnHelper<typeof features, ReviewRow>()
const columns = helper.columns([
  helper.accessor('employeeName', { header: 'თანამშრომელი' }),
  helper.accessor('workDate', { header: 'სამუშაო დღე' }),
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
  helper.display({
    id: 'status',
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
              item.reviewState === 'approved'
                ? 'green'
                : item.reviewState === 'rejected'
                  ? 'red'
                  : 'yellow'
            }
          >
            {item.reviewState === 'approved'
              ? 'დადასტურებული'
              : item.reviewState === 'rejected'
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
    id: 'actions',
    header: 'მოქმედებები',
    cell: ({ row }) => <AttendanceReviewDialog session={row.original} />,
  }),
])

const companyColumns = columns.filter((column) => column.id !== 'actions')

export function AttendanceReviewTable({
  actorId,
  exceptionsOnly = false,
  userId,
  company = false,
}: {
  actorId: string
  exceptionsOnly?: boolean
  userId?: string
  company?: boolean
}) {
  const [page, setPage] = useState(0)
  const query = useQuery({
    queryKey: [
      'team-attendance',
      actorId,
      company,
      exceptionsOnly,
      userId,
      page,
    ],
    queryFn: () =>
      (company ? readCompanyAttendance : readTeamAttendance)({
        data: { page, exceptionsOnly, userId },
      }),
    retry: false,
    refetchInterval: 60000,
  })
  const result = query.data
  const data = useMemo(
    () =>
      result?.ok
        ? result.value.items.map((item) => ({
            ...item,
            serverNow: result.value.serverNow,
          }))
        : [],
    [result],
  )
  const table = useTable({
    features,
    columns: company ? companyColumns : columns,
    data,
    getRowId: (row) => row.id,
  })
  async function refresh() {
    const response = await query.refetch().catch(() => null)
    if (response?.data?.ok && !response.isError)
      toast.success('დასწრების მონაცემები განახლებულია.')
    else toast.error('მონაცემები ვერ განახლდა. სცადეთ ხელახლა.')
  }
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {company
            ? 'ნაჩვენებია ყველა თანამშრომლის დასწრების ჩანაწერები. ეს გვერდი მხოლოდ დათვალიერებისთვისაა.'
            : 'ჩანს მხოლოდ თქვენთვის მინიჭებული თანამშრომლების ჩანაწერები.'}{' '}
          დრო მითითებულია ჩანაწერის დროის სარტყელში.
        </p>
        <Button
          variant="outline"
          disabled={query.isFetching}
          aria-busy={query.isFetching}
          onClick={() => void refresh()}
        >
          {query.isFetching ? <Spinner aria-hidden="true" /> : null}განახლება
        </Button>
      </div>
      {query.isPending ? (
        <div
          role="status"
          aria-label="დასწრების ჩანაწერები იტვირთება"
          aria-busy="true"
        >
          <Skeleton className="h-64 w-full" aria-hidden="true" />
        </div>
      ) : query.isError || !result?.ok ? (
        <Alert variant="destructive">
          <AlertDescription>
            {result && !result.ok
              ? result.message
              : 'დასწრება ვერ ჩაიტვირთა. გადაამოწმეთ წვდომა.'}
          </AlertDescription>
        </Alert>
      ) : !data.length ? (
        <p className="rounded-xl border p-6 text-muted-foreground">
          {company
            ? 'დასწრების ჩანაწერები არ მოიძებნა.'
            : 'ჩანაწერები არ მოიძებნა. თანამშრომლების მინიჭებას დასწრების პარამეტრებში შესაბამისი უფლებამოსილების მქონე პირი მართავს.'}
        </p>
      ) : (
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
      )}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          disabled={page === 0 || query.isFetching}
          onClick={() => setPage((value) => value - 1)}
        >
          წინა
        </Button>
        <span className="text-sm">გვერდი {page + 1}</span>
        <Button
          variant="outline"
          disabled={!result?.ok || !result.value.hasMore || query.isFetching}
          onClick={() => setPage((value) => value + 1)}
        >
          შემდეგი
        </Button>
      </div>
    </section>
  )
}
