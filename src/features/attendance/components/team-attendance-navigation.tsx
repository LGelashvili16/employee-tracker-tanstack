import { Link, useLocation } from '@tanstack/react-router'
import type { Role } from '#/lib/authorization/permissions'
import { hasPermission } from '#/lib/authorization/permissions'
import { Button } from '#/components/ui/button'

const links = [
  {
    to: '/manage/timesheets',
    label: 'სამუშაო საათები',
    permission: 'timesheets.review.team',
  },
  {
    to: '/manage/attendance',
    label: 'გუნდის დასწრება',
    permission: 'attendance.read.team',
  },
  {
    to: '/manage/attendance/exceptions',
    label: 'დასწრების გამონაკლისები',
    permission: 'attendance.review.team',
  },
] as const

export function TeamAttendanceNavigation({
  roles,
}: {
  roles: ReadonlyArray<Role>
}) {
  const pathname = useLocation({ select: (location) => location.pathname })
  return (
    <nav
      aria-label="გუნდის დასწრების განყოფილებები"
      className="flex flex-wrap gap-2"
    >
      {links
        .filter((item) => hasPermission(roles, item.permission))
        .map((item) => {
          const active = pathname.replace(/\/$/, '') === item.to
          return (
            <Button
              key={item.to}
              nativeButton={false}
              role="link"
              variant={active ? 'secondary' : 'ghost'}
              render={
                <Link to={item.to} aria-current={active ? 'page' : undefined} />
              }
            >
              {item.label}
            </Button>
          )
        })}
    </nav>
  )
}
