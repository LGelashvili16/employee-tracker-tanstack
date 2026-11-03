import type { Permission } from '#/lib/authorization/permissions'

export const navigationItems = [
  {
    to: '/dashboard',
    label: 'მთავარი გვერდი',
    permission: null,
  },
  {
    to: '/attendance',
    label: 'დასწრება',
    permission: null,
  },
  {
    to: '/attendance/history',
    label: 'დასწრების ისტორია',
    permission: null,
  },
  {
    to: '/attendance/corrections',
    label: 'დროის შესწორებები',
    permission: null,
  },
  {
    to: '/timesheets',
    label: 'სამუშაო საათები',
    permission: null,
  },
  {
    to: '/schedule',
    label: 'ჩემი განრიგი',
    permission: null,
  },
  {
    to: '/jobs',
    label: 'ჩემი სამუშაოები',
    permission: null,
  },
  {
    to: '/leave',
    label: 'შვებულება და გაცდენა',
    permission: null,
  },
  {
    to: '/notifications',
    label: 'შეტყობინებები',
    permission: null,
  },
  {
    to: '/settings/profile',
    label: 'ჩემი პროფილი',
    permission: null,
  },
  {
    to: '/settings/security',
    label: 'ანგარიშის უსაფრთხოება',
    permission: null,
  },
  {
    to: '/onboarding',
    label: 'სამუშაო სივრცეში დაწყება',
    permission: null,
  },
  {
    to: '/manage',
    label: 'მართვის მიმოხილვა',
    permission: 'manage.access',
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
  {
    to: '/manage/timesheets',
    label: 'საათების განხილვა',
    permission: 'timesheets.review.team',
  },
  {
    to: '/manage/schedule',
    label: 'განრიგის მართვა',
    permission: 'schedule.manage',
  },
  {
    to: '/manage/jobs',
    label: 'სამუშაოების მართვა',
    permission: 'jobs.manage',
  },
  {
    to: '/manage/jobs/new',
    label: 'ახალი სამუშაო',
    permission: 'jobs.manage',
  },
  {
    to: '/manage/employees',
    label: 'თანამშრომლები',
    permission: 'employees.read',
  },
  {
    to: '/manage/teams',
    label: 'გუნდები',
    permission: 'teams.manage',
  },
  {
    to: '/manage/leave',
    label: 'შვებულების განხილვა',
    permission: 'leave.review',
  },
  {
    to: '/manage/reports',
    label: 'ანგარიშები',
    permission: 'reports.read',
  },
  {
    to: '/admin',
    label: 'ადმინისტრირება',
    permission: 'admin.access',
  },
  {
    to: '/admin/users',
    label: 'მომხმარებლები',
    permission: 'users.manage',
  },
  {
    to: '/admin/invitations',
    label: 'მოწვევები',
    permission: 'invitations.manage',
  },
  {
    to: '/admin/roles',
    label: 'როლები და უფლებები',
    permission: 'roles.manage',
  },
  {
    to: '/admin/settings/company',
    label: 'კომპანიის პარამეტრები',
    permission: 'company.configure',
  },
  {
    to: '/admin/settings/attendance',
    label: 'დასწრების წესები',
    permission: 'attendance.configure',
  },
  {
    to: '/admin/settings/approvals',
    label: 'დადასტურების წესები',
    permission: 'approvals.configure',
  },
  {
    to: '/admin/settings/leave',
    label: 'შვებულების წესები',
    permission: 'leave.configure',
  },
  {
    to: '/admin/settings/security',
    label: 'უსაფრთხოების პოლიტიკა',
    permission: 'security.configure',
  },
  {
    to: '/admin/settings/notifications',
    label: 'შეტყობინებების პარამეტრები',
    permission: 'notifications.configure',
  },
  {
    to: '/admin/locations',
    label: 'სამუშაო ადგილები',
    permission: 'locations.manage',
  },
  {
    to: '/admin/integrations',
    label: 'ინტეგრაციები',
    permission: 'integrations.manage',
  },
  {
    to: '/admin/audit-log',
    label: 'მოქმედებების ჟურნალი',
    permission: 'audit.read',
  },
] as const satisfies ReadonlyArray<{
  to: string
  label: string
  permission: Permission | null
}>
