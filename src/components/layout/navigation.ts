import {
  IconLayoutDashboard,
  IconClock,
  IconClockEdit,
  IconCalendarStats,
  IconCalendarWeek,
  IconCalendarOff,
  IconBell,
  IconUserCircle,
  IconLock,
  IconCalendarCog,
  IconUsers,
  IconCalendarCheck,
  IconReportAnalytics,
  IconMailPlus,
  IconKey,
  IconBuildingCommunity,
  IconChecklist,
  IconCalendarPause,
  IconShieldLock,
  IconBellCog,
  IconMapPin,
  IconPlugConnected,
  IconFileSearch,
  IconUserShield,
} from '@tabler/icons-react'
import type { Permission } from '#/lib/authorization/permissions'

export const navigationItems = [
  {
    to: '/admin/access',
    icon: IconUserShield,
    label: 'მომხმარებლების წვდომა',
    permission: 'users.manage',
  },
  {
    to: '/dashboard',
    icon: IconLayoutDashboard,
    label: 'მთავარი გვერდი',
    permission: null,
  },
  {
    to: '/attendance',
    icon: IconClock,
    label: 'დასწრება',
    permission: null,
  },
  {
    to: '/attendance/corrections',
    secondary: true,
    icon: IconClockEdit,
    label: 'დროის შესწორებები',
    permission: null,
  },
  {
    to: '/timesheets',
    secondary: true,
    icon: IconCalendarStats,
    label: 'სამუშაო საათები',
    permission: null,
  },
  {
    to: '/schedule',
    icon: IconCalendarWeek,
    label: 'ჩემი განრიგი',
    permission: null,
  },
  {
    to: '/jobs',
    icon: IconMapPin,
    label: 'სამუშაოების რუკა',
    permission: null,
  },
  {
    to: '/vacation',
    icon: IconCalendarOff,
    label: 'შვებულება',
    permission: null,
  },
  {
    to: '/notifications',
    secondary: true,
    icon: IconBell,
    label: 'შეტყობინებები',
    permission: null,
  },
  {
    to: '/settings/profile',
    secondary: true,
    icon: IconUserCircle,
    label: 'ჩემი პროფილი',
    permission: null,
  },
  {
    to: '/settings/security',
    secondary: true,
    icon: IconLock,
    label: 'ანგარიშის უსაფრთხოება',
    permission: null,
  },
  {
    to: '/manage/schedule',
    icon: IconCalendarCog,
    label: 'სამუშაო განრიგი',
    permission: 'attendance.configure',
  },
  {
    to: '/manage/employees',
    icon: IconUsers,
    label: 'თანამშრომლები',
    permission: 'employees.manage',
  },
  {
    to: '/manage/vacations',
    icon: IconCalendarCheck,
    label: 'შვებულებები',
    permission: 'leave.review',
  },
  {
    to: '/manage/reports',
    icon: IconReportAnalytics,
    label: 'რეპორტები',
    permission: 'reports.read',
  },
  {
    to: '/admin/invitations',
    icon: IconMailPlus,
    label: 'მოწვევები',
    permission: 'invitations.manage',
  },
  {
    to: '/admin/roles',
    icon: IconKey,
    label: 'როლები და უფლებები',
    permission: 'roles.manage',
  },
  {
    to: '/admin/settings/company',
    icon: IconBuildingCommunity,
    label: 'კომპანიის პარამეტრები',
    permission: 'company.configure',
  },
  {
    to: '/manage/attendance',
    icon: IconClock,
    label: 'დასწრებები',
    permission: [
      'attendance.read.all',
      'attendance.read.team',
      'timesheets.review.team',
    ],
  },
  {
    to: '/admin/settings/approvals',
    icon: IconChecklist,
    label: 'დადასტურების წესები',
    permission: 'approvals.configure',
  },
  {
    to: '/admin/settings/leave',
    icon: IconCalendarPause,
    label: 'შვებულების წესები',
    permission: 'leave.configure',
  },
  {
    to: '/admin/settings/security',
    icon: IconShieldLock,
    label: 'უსაფრთხოების პოლიტიკა',
    permission: 'security.configure',
  },
  {
    to: '/admin/settings/notifications',
    icon: IconBellCog,
    label: 'შეტყობინებების პარამეტრები',
    permission: 'notifications.configure',
  },
  {
    to: '/admin/locations',
    icon: IconMapPin,
    label: 'სამუშაო ადგილები',
    permission: 'locations.manage',
  },
  {
    to: '/admin/integrations',
    icon: IconPlugConnected,
    label: 'ინტეგრაციები',
    permission: 'integrations.manage',
  },
  {
    to: '/admin/audit-log',
    icon: IconFileSearch,
    label: 'მოქმედებების ჟურნალი',
    permission: 'audit.read',
  },
] as const satisfies ReadonlyArray<{
  to: string
  label: string
  icon: typeof IconLayoutDashboard
  permission: Permission | ReadonlyArray<Permission> | null
  secondary?: boolean
}>

export function isNavigationItemActive(pathname: string, destination: string) {
  const path = pathname.replace(/\/$/, '')
  if (destination === '/attendance') {
    return (
      path === '/attendance' ||
      path.startsWith('/attendance/') ||
      path === '/timesheets' ||
      path.startsWith('/timesheets/')
    )
  }
  if (
    destination === '/manage/employees' ||
    destination === '/manage/attendance'
  ) {
    return path === destination || path.startsWith(`${destination}/`)
  }
  return path === destination
}
