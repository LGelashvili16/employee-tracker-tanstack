import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'

const links = [
  { to: '/admin/attendance', label: 'ყველა თანამშრომლის დასწრება' },
  { to: '/admin/timesheets', label: 'ყველა თანამშრომლის სამუშაო საათები' },
] as const

export function CompanyAttendanceNavigation({ userId }: { userId?: string }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  return (
    <nav
      aria-label="კომპანიის დასწრების განყოფილებები"
      className="flex flex-wrap gap-2"
    >
      {links.map((link) => (
        <Button
          key={link.to}
          variant={
            pathname === link.to || pathname.startsWith(`${link.to}/`)
              ? 'secondary'
              : 'ghost'
          }
          nativeButton={false}
          role="link"
          render={
            <Link
              to={link.to}
              search={{ userId }}
              aria-current={
                pathname === link.to || pathname.startsWith(`${link.to}/`)
                  ? 'page'
                  : undefined
              }
            />
          }
        >
          {link.label}
        </Button>
      ))}
    </nav>
  )
}
