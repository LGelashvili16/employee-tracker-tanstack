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
import type { PermissionOverrides, Role } from '#/lib/authorization/permissions'

/** The employee attendance workspace enforces company or assigned-employee scope on the server. */
export function UserWorkRecordsCard({
  roles,
  permissionOverrides,
  userId,
}: {
  roles: ReadonlyArray<Role>
  permissionOverrides?: PermissionOverrides
  userId: string
}) {
  const canReadCompany = hasEveryPermission({ roles, permissionOverrides }, [
    'manage.access',
    'attendance.read.all',
  ])
  const canReadAttendance =
    canReadCompany ||
    hasEveryPermission({ roles, permissionOverrides }, [
      'manage.access',
      'attendance.read.team',
    ])
  const canReviewTimesheets =
    canReadCompany ||
    hasEveryPermission({ roles, permissionOverrides }, [
      'manage.access',
      'timesheets.review.team',
    ])
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
            depth="raised"
            nativeButton={false}
            role="link"
            render={
              <Link to="/manage/attendance/$userId" params={{ userId }} />
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
            depth="raised"
            nativeButton={false}
            role="link"
            render={
              <Link
                to="/manage/attendance/$userId"
                params={{ userId }}
                search={{ view: 'timesheet' }}
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
