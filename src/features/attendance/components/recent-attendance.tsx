import { Badge } from '#/components/ui/badge'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { IconHistory } from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatAttendanceTime, formatWorkedTime } from '../attendance.rules'
import type { AttendanceDay, AttendanceOverview } from '../attendance.types'
import { cn } from '#/lib/utils'
import { formatAttendanceDate } from '../attendance.presentation'
import { AttendanceDeviationBadges } from './attendance-deviation-badges'
import { companyLocalDate } from '#/features/scheduling/scheduling.rules'

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, AttendanceDay>()
const columns = helper.columns([
  helper.accessor('date', { header: 'თარიღი' }),
  helper.accessor('firstIn', { header: 'შესვლა' }),
  helper.accessor('lastOut', { header: 'გასვლა' }),
  helper.accessor('seconds', { header: 'ნამუშევარი' }),
  helper.display({ id: 'status', header: 'სტატუსი' }),
])

export function RecentAttendance({
  overview,
  workLog = false,
}: {
  overview: AttendanceOverview
  workLog?: boolean
}) {
  const table = useTable({
    features,
    columns,
    data: overview.recent,
    getRowId: (day) => day.date,
  })
  return (
    <Card
      className={cn(
        'rounded-2xl shadow-sm [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]',
        workLog &&
          'gap-4 rounded-none bg-transparent shadow-none ring-0 [--card-spacing:0] sm:[--card-spacing:0]',
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground',
              workLog && 'hidden',
            )}
          >
            <IconHistory className="size-5" aria-hidden="true" />
          </span>
          {workLog ? <h2>ბოლო დასწრებები</h2> : 'ბოლო დასწრებები'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!overview.recent.length ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center">
            <IconHistory
              className="size-7 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              დასწრების ჩანაწერები ჯერ არ არის.
            </p>
          </div>
        ) : (
          <Table aria-label="ბოლო დასწრებები">
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
              {table.getRowModel().rows.map(({ original: day }) => (
                <TableRow key={day.date}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {formatAttendanceDate(day.date, true)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatAttendanceTime(day.firstIn, day.timezone)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {day.lastOut
                      ? `${companyLocalDate(new Date(day.lastOut), day.timezone) !== day.date ? `${formatAttendanceDate(companyLocalDate(new Date(day.lastOut), day.timezone), true)} ` : ''}${formatAttendanceTime(day.lastOut, day.timezone)}`
                      : 'ჯერ არ დაფიქსირებულა'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatWorkedTime(day.seconds)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {day.incomplete ? (
                        <Badge variant={day.requiresReview ? 'red' : 'green'}>
                          {day.requiresReview
                            ? 'გადასამოწმებელია'
                            : day.date < overview.workday.date
                              ? 'წინა დღეს დაწყებული'
                              : 'მიმდინარე'}
                        </Badge>
                      ) : null}
                      <AttendanceDeviationBadges {...day} />
                      {!day.incomplete &&
                      !day.lateSeconds &&
                      !day.earlySeconds &&
                      !day.outsideSeconds ? (
                        <Badge variant="green">დროულად</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
