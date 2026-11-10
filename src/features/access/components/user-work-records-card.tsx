import { Link } from '@tanstack/react-router'
import {
  IconArrowUpRight,
  IconCalendarClock,
  IconClock,
} from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
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
    <Card className="rounded-2xl py-5 sm:py-6">
      <CardHeader className="px-5 sm:px-6">
        <CardTitle>
          <h2>სამუშაო ჩანაწერები</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 px-5 sm:grid-cols-2 sm:px-6">
        {canReadAttendance ? (
          <Button
            variant="outline"
            depth="raised"
            nativeButton={false}
            role="link"
            className="h-auto min-w-0 justify-start gap-3 px-4 py-4 whitespace-normal"
            render={
              <Link to="/manage/attendance/$userId" params={{ userId }} />
            }
          >
            <IconCalendarClock data-icon="inline-start" aria-hidden="true" />
            <span className="flex-1 text-start">დასწრების ჩანაწერები</span>
            <IconArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        ) : null}
        {canReviewTimesheets ? (
          <Button
            variant="outline"
            depth="raised"
            nativeButton={false}
            role="link"
            className="h-auto min-w-0 justify-start gap-3 px-4 py-4 whitespace-normal"
            render={
              <Link
                to="/manage/attendance/$userId"
                params={{ userId }}
                search={{ view: 'timesheet' }}
              />
            }
          >
            <IconClock data-icon="inline-start" aria-hidden="true" />
            <span className="flex-1 text-start">სამუშაო საათები</span>
            <IconArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
