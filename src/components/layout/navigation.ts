import {
  IconLayoutDashboard,
  IconClock,
  IconHistory,
  IconClockEdit,
  IconCalendarStats,
  IconCalendarWeek,
  IconCalendarOff,
  IconBell,
  IconUserCircle,
  IconLock,
  IconChartBar,
  IconClockCheck,
  IconAlertTriangle,
  IconClipboardCheck,
  IconCalendarCog,
  IconListCheck,
  IconCirclePlus,
  IconUsers,
  IconUsersGroup,
  IconCalendarCheck,
  IconReportAnalytics,
  IconShield,
  IconUserCog,
  IconMailPlus,
  IconKey,
  IconBuildingCommunity,
  IconClockCog,
  IconChecklist,
  IconCalendarPause,
  IconShieldLock,
  IconBellCog,
  IconMapPin,
  IconPlugConnected,
  IconFileSearch,
} from '@tabler/icons-react'
import type { Permission } from '#/lib/authorization/permissions'

export const navigationItems = [
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
    to: '/attendance/history',
    secondary: true,
    icon: IconHistory,
    label: 'დასწრების ისტორია',
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
    to: '/leave',
    icon: IconCalendarOff,
    label: 'შვებულება და გაცდენა',
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
    to: '/manage',
    icon: IconChartBar,
    label: 'მართვის მიმოხილვა',
    permission: 'manage.access',
  },
  {
    to: '/manage/attendance',
    icon: IconClockCheck,
    label: 'გუნდის დასწრება',
    permission: 'attendance.read.team',
  },
  {
    to: '/manage/attendance/exceptions',
    secondary: true,
    icon: IconAlertTriangle,
    label: 'დასწრების გამონაკლისები',
    permission: 'attendance.review.team',
  },
  {
    to: '/manage/timesheets',
    icon: IconClipboardCheck,
    label: 'საათების განხილვა',
    permission: 'timesheets.review.team',
  },
  {
    to: '/manage/schedule',
    icon: IconCalendarCog,
    label: 'განრიგის მართვა',
    permission: 'schedule.manage',
  },
  {
    to: '/manage/jobs',
    icon: IconListCheck,
    label: 'სამუშაოების მართვა',
    permission: 'jobs.manage',
  },
  {
    to: '/manage/jobs/new',
    secondary: true,
    icon: IconCirclePlus,
    label: 'ახალი სამუშაო',
    permission: 'jobs.manage',
  },
  {
    to: '/manage/employees',
    icon: IconUsers,
    label: 'თანამშრომლები',
    permission: 'employees.read',
  },
  {
    to: '/manage/teams',
    icon: IconUsersGroup,
    label: 'გუნდები',
    permission: 'teams.manage',
  },
  {
    to: '/manage/leave',
    icon: IconCalendarCheck,
    label: 'შვებულების განხილვა',
    permission: 'leave.review',
  },
  {
    to: '/manage/reports',
    icon: IconReportAnalytics,
    label: 'ანგარიშები',
    permission: 'reports.read',
  },
  {
    to: '/admin/dashboard',
    icon: IconShield,
    label: 'ადმინისტრირების მიმოხილვა',
    permission: 'admin.access',
  },
  {
    to: '/admin/users',
    icon: IconUserCog,
    label: 'მომხმარებლები',
    permission: 'users.manage',
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
    to: '/admin/attendance',
    icon: IconClock,
    label: 'ყველა თანამშრომლის დასწრება',
    permission: 'attendance.read.all',
  },
  {
    to: '/admin/timesheets',
    icon: IconChecklist,
    label: 'ყველა თანამშრომლის სამუშაო საათები',
    permission: 'attendance.read.all',
  },
  {
    to: '/admin/settings/attendance',
    icon: IconClockCog,
    label: 'დასწრების წესები',
    permission: 'attendance.configure',
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
  permission: Permission | null
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
    destination === '/manage/attendance' ||
    destination === '/manage/jobs' ||
    destination === '/admin/attendance'
  ) {
    return path === destination || path.startsWith(`${destination}/`)
  }
  return path === destination
}
