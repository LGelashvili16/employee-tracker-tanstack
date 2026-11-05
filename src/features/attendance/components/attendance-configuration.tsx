import { useQuery } from '@tanstack/react-query'
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
        <Skeleton className="h-64" aria-hidden="true" />
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
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>ხანგრძლივი სამუშაოს გადამოწმება</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceLimitForm
            key={settings.setting.revision}
            setting={settings.setting}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>დასწრების ხელმძღვანელის მინიჭება</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AttendanceAssignmentForm
            employees={settings.employees}
            reviewers={settings.reviewers}
          />
          {settings.truncated ? (
            <p className="text-sm text-muted-foreground">
              ნაჩვენებია პირველი 500 თანამშრომელი და მინიჭება.
            </p>
          ) : null}
          <ul className="flex flex-col gap-2 text-sm">
            {settings.assignments.map((item) => (
              <li key={`${item.employeeId}:${item.reviewerId}`}>
                {settings.employees.find(
                  (person) => person.id === item.employeeId,
                )?.name ?? 'არააქტიური თანამშრომელი'}
                :{' '}
                {settings.reviewers.find(
                  (person) => person.id === item.reviewerId,
                )?.name ?? 'არააქტიური ხელმძღვანელი'}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
