import { Link, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'

const attendanceLinks = [
  { to: '/attendance', label: 'დასწრება' },
  { to: '/attendance/history', label: 'დასწრების ისტორია' },
  { to: '/attendance/corrections', label: 'დროის შესწორებები' },
  { to: '/timesheets', label: 'სამუშაო საათები' },
] as const

export function AttendanceNavigation({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const activePath = pathname.replace(/\/$/, '')
  return (
    <Tabs value={activePath} className="min-w-0 gap-6">
      <nav
        aria-label="დასწრების განყოფილებები"
        className="-m-1 overflow-x-auto p-1"
      >
        <TabsList
          aria-label="დასწრების განყოფილებები"
          className="w-max gap-1 rounded-xl border p-0.5 group-data-horizontal/tabs:h-auto"
        >
          {attendanceLinks.map((item) => (
            <TabsTrigger
              nativeButton={false}
              key={item.to}
              value={item.to}
              className="h-9 flex-none rounded-lg px-4 motion-reduce:transition-none"
              render={
                <Link
                  to={item.to}
                  aria-current={activePath === item.to ? 'page' : undefined}
                />
              }
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </nav>
      {attendanceLinks.map((item) => (
        <TabsContent key={item.to} value={item.to}>
          {activePath === item.to ? children : null}
        </TabsContent>
      ))}
    </Tabs>
  )
}
