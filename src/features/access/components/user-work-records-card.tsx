import { Link } from '@tanstack/react-router'
import {
  IconArrowUpRight,
  IconCalendarClock,
  IconClock,
} from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { hasEveryPermission } from '#/lib/authorization/permissions'
import type { Role } from '#/lib/authorization/permissions'

/** Prefer explicit company read access; assigned management review remains a separate workflow. */
export function UserWorkRecordsCard({
  roles,
  userId,
}: {
  roles: ReadonlyArray<Role>
  userId: string
}) {
  const canReadCompany = hasEveryPermission(roles, [
    'admin.access',
    'attendance.read.all',
  ])
  const canReadAttendance =
    canReadCompany ||
    hasEveryPermission(roles, ['manage.access', 'attendance.read.team'])
  const canReviewTimesheets =
    canReadCompany ||
    hasEveryPermission(roles, ['manage.access', 'timesheets.review.team'])
  if (!canReadAttendance && !canReviewTimesheets) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>სამუშაო ჩანაწერები</CardTitle>
        <CardDescription>
          გახსენით ამ თანამშრომლის დასწრების ჩანაწერები და სამუშაო საათები
          თქვენი წვდომის ფარგლებში.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {canReadAttendance ? (
          <Button
            variant="outline"
            nativeButton={false}
            role="link"
            render={
              canReadCompany ? (
                <Link to="/admin/attendance/$userId" params={{ userId }} />
              ) : (
                <Link to="/manage/attendance" search={{ userId }} />
              )
            }
          >
            <IconCalendarClock data-icon="inline-start" aria-hidden="true" />
            დასწრების ჩანაწერები
            <IconArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        ) : null}
        {canReviewTimesheets ? (
          <Button
            variant="outline"
            nativeButton={false}
            role="link"
            render={
              <Link
                to={canReadCompany ? '/admin/timesheets' : '/manage/timesheets'}
                search={{ userId }}
              />
            }
          >
            <IconClock data-icon="inline-start" aria-hidden="true" />
            სამუშაო საათები
            <IconArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
