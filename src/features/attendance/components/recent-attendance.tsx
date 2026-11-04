import { Badge } from '#/components/ui/badge'
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
import {
  formatAttendanceDuration,
  formatAttendanceTime,
  formatWorkedTime,
} from '../attendance.rules'
import type { AttendanceOverview } from '../attendance.types'
import { formatAttendanceDate } from '../attendance.presentation'

export function RecentAttendance({
  overview,
}: {
  overview: AttendanceOverview
}) {
  return (
    <Card className="rounded-2xl shadow-sm [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IconHistory className="size-5" aria-hidden="true" />
          </span>
          ბოლო დასწრებები
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>თარიღი</TableHead>
                <TableHead>შესვლა</TableHead>
                <TableHead>გასვლა</TableHead>
                <TableHead>ნამუშევარი</TableHead>
                <TableHead>სტატუსი</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.recent.map((day) => (
                <TableRow key={day.date}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {formatAttendanceDate(day.date, true)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatAttendanceTime(day.firstIn, day.timezone)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {day.lastOut
                      ? formatAttendanceTime(day.lastOut, day.timezone)
                      : 'ჯერ არ დაფიქსირებულა'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatWorkedTime(day.seconds)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {day.incomplete ? (
                        <Badge
                          variant={
                            day.date < overview.workday.date ? 'red' : 'green'
                          }
                        >
                          {day.date < overview.workday.date
                            ? 'გამოტოვებული გასვლა'
                            : 'მიმდინარე'}
                        </Badge>
                      ) : null}
                      {day.lateSeconds > 0 ? (
                        <Badge variant="orange">
                          დაგვიანება {formatAttendanceDuration(day.lateSeconds)}
                        </Badge>
                      ) : null}
                      {day.earlySeconds > 0 ? (
                        <Badge variant="yellow">
                          ადრე გასვლა{' '}
                          {formatAttendanceDuration(day.earlySeconds)}
                        </Badge>
                      ) : null}
                      {!day.incomplete &&
                      !day.lateSeconds &&
                      !day.earlySeconds ? (
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
