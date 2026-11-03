import { z } from 'zod'

export const permissionSchema = z.enum(
  [
    'manage.access',
    'attendance.read.team',
    'attendance.review.team',
    'timesheets.review.team',
    'schedule.manage',
    'jobs.manage',
    'employees.read',
    'employees.manage',
    'teams.manage',
    'leave.review',
    'reports.read',
    'admin.access',
    'users.manage',
    'invitations.manage',
    'roles.manage',
    'company.configure',
    'attendance.configure',
    'approvals.configure',
    'leave.configure',
    'security.configure',
    'notifications.configure',
    'locations.manage',
    'integrations.manage',
    'audit.read',
  ],
  { error: 'წვდომის მოთხოვნა არასწორია.' },
)
export type Permission = z.infer<typeof permissionSchema>
export const roleSchema = z.enum([
  'employee',
  'supervisor',
  'operations_manager',
  'hr_manager',
  'admin',
  'owner',
])
export type Role = z.infer<typeof roleSchema>

const managementPermissions: Record<
  'supervisor' | 'operations_manager' | 'hr_manager',
  ReadonlyArray<Permission>
> = {
  supervisor: [
    'manage.access',
    'attendance.read.team',
    'attendance.review.team',
    'timesheets.review.team',
    'jobs.manage',
    'employees.read',
    'leave.review',
  ],
  operations_manager: [
    'manage.access',
    'attendance.read.team',
    'schedule.manage',
    'jobs.manage',
    'employees.read',
    'teams.manage',
    'reports.read',
  ],
  hr_manager: [
    'manage.access',
    'attendance.read.team',
    'attendance.review.team',
    'timesheets.review.team',
    'employees.read',
    'employees.manage',
    'teams.manage',
    'leave.review',
    'reports.read',
  ],
}
const adminPermissions: ReadonlyArray<Permission> = [
  'admin.access',
  'users.manage',
  'invitations.manage',
  'roles.manage',
  'company.configure',
  'attendance.configure',
  'approvals.configure',
  'leave.configure',
  'security.configure',
  'notifications.configure',
  'locations.manage',
  'integrations.manage',
  'audit.read',
]
export const roleLabels: Record<Role, string> = {
  employee: 'თანამშრომელი',
  supervisor: 'ჯგუფის ხელმძღვანელი',
  operations_manager: 'ოპერაციების მენეჯერი',
  hr_manager: 'პერსონალის მენეჯერი',
  admin: 'ადმინისტრატორი',
  owner: 'კომპანიის მფლობელი',
}

/** Roles are provisioned on the server; malformed stored grants never confer access. */
export function parseRoles(value: string): Array<Role> {
  const result = z
    .array(roleSchema)
    .safeParse(value.split(',').map((role) => role.trim()))
  return result.success ? [...new Set(result.data)] : []
}
export function hasPermission(
  roles: ReadonlyArray<Role>,
  permission: Permission,
) {
  return roles.some((role) => {
    if (role === 'owner') return true
    if (role === 'admin') return adminPermissions.includes(permission)
    if (role === 'employee') return false
    return managementPermissions[role].includes(permission)
  })
}
