import { Link, useLocation } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import type { ReactNode } from 'react'

const links = [
  { to: '/admin/attendance', label: 'დასწრება' },
  { to: '/admin/timesheets', label: 'სამუშაო საათები' },
] as const

export function CompanyAttendanceNavigation({
  userId,
  children,
}: {
  userId?: string
  children?: ReactNode
}) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const active = pathname.startsWith('/admin/timesheets')
    ? '/admin/timesheets'
    : '/admin/attendance'
  return (
    <Tabs value={active} className="min-w-0 gap-6">
      <nav
        aria-label="კომპანიის დასწრების განყოფილებები"
        className="-m-1 overflow-x-auto p-1"
      >
        <TabsList
          aria-label="კომპანიის დასწრების განყოფილებები"
          className="w-max gap-1 rounded-xl border p-0.5 group-data-horizontal/tabs:h-auto"
        >
          {links.map((link) => (
            <TabsTrigger
              key={link.to}
              value={link.to}
              className="h-9 flex-none rounded-lg px-4 motion-reduce:transition-none"
              nativeButton={false}
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
            </TabsTrigger>
          ))}
        </TabsList>
      </nav>
      {children ? (
        <TabsContent value={active} className="min-w-0">
          {children}
        </TabsContent>
      ) : null}
    </Tabs>
  )
}
