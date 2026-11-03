import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'

const attendanceLinks = [
  { to: '/attendance', label: 'დასწრება' },
  { to: '/attendance/history', label: 'დასწრების ისტორია' },
  { to: '/attendance/corrections', label: 'დროის შესწორებები' },
  { to: '/timesheets', label: 'სამუშაო საათები' },
] as const

export function AttendanceNavigation() {
  const pathname = useLocation({ select: (location) => location.pathname })
  return (
    <nav aria-label="დასწრების განყოფილებები" className="flex flex-wrap gap-2">
      {attendanceLinks.map((item) => {
        const active = pathname.replace(/\/$/, '') === item.to
        return (
          <Button
            nativeButton={false}
            role="link"
            key={item.to}
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
