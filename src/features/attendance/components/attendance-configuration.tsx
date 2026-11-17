import { useQuery } from '@tanstack/react-query'
import {
  IconClockHour4,
  IconInfoCircle,
  IconUserCheck,
} from '@tabler/icons-react'
import { readAttendanceSettings } from '../attendance.functions'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { AttendanceLimitForm } from './attendance-limit-form'
import { AttendanceAssignmentForm } from './attendance-assignment-form'

export function AttendanceConfiguration({ actorId }: { actorId: string }) {
  const query = useQuery({
    queryKey: ['attendance-configuration', actorId],
    queryFn: () => readAttendanceSettings(),
    retry: false,
  })
  if (query.isPending)
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="დასწრების პარამეტრები იტვირთება"
      >
        <div className="grid max-w-6xl gap-6 lg:grid-cols-2" aria-hidden="true">
          <Skeleton className="h-80" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  const result = query.data
  if (query.isError || !result?.ok)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {result && !result.ok
            ? result.message
            : 'დასწრების პარამეტრები ვერ ჩაიტვირთა.'}
        </AlertDescription>
      </Alert>
    )
  const settings = result.value
  return (
    <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-2">
      <Card className="rounded-2xl [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 font-semibold">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <IconClockHour4 className="size-5" aria-hidden="true" />
            </span>
            ხანგრძლივი სამუშაოს გადამოწმება
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceLimitForm
            key={settings.setting.revision}
            setting={settings.setting}
          />
        </CardContent>
      </Card>
      <Card className="rounded-2xl [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 font-semibold">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <IconUserCheck className="size-5" aria-hidden="true" />
            </span>
            დასწრების განმხილველი
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AttendanceAssignmentForm
            employees={settings.employees}
            reviewers={settings.reviewers}
          />
          {settings.truncated ? (
            <Alert variant="info" role="note">
              <IconInfoCircle aria-hidden="true" />
              <AlertDescription>
                ნაჩვენებია პირველი 500 თანამშრომელი და მინიჭება.
              </AlertDescription>
            </Alert>
          ) : null}
          {settings.assignments.length ? (
            <section
              className="border-t pt-4"
              aria-labelledby="attendance-assignments-title"
            >
              <h3
                id="attendance-assignments-title"
                className="mb-3 text-sm font-medium"
              >
                არსებული მინიჭებები
              </h3>
              <ul className="flex flex-col gap-2 text-sm">
                {settings.assignments.map((item) => (
                  <li
                    key={`${item.employeeId}:${item.reviewerId}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-3 py-2"
                  >
                    <span>
                      {settings.employees.find(
                        (person) => person.id === item.employeeId,
                      )?.name ?? 'არააქტიური თანამშრომელი'}
                    </span>
                    <span className="text-muted-foreground">
                      {settings.reviewers.find(
                        (person) => person.id === item.reviewerId,
                      )?.name ?? 'არააქტიური ხელმძღვანელი'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
