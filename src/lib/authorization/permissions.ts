import { z } from 'zod'
import { createAccessControl } from 'better-auth/plugins/access'

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
export const roleSchema = z.enum(
  [
    'employee',
    'supervisor',
    'operations_manager',
    'hr_manager',
    'admin',
    'owner',
  ],
  { error: 'როლი არასწორია.' },
)
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

// A single resource preserves the existing permission identifiers used by routes.
// Better Auth handles role authorization; resource ownership stays in feature policies.
export const accessControl = createAccessControl({
  teamwork: permissionSchema.options,
})
export const roles = {
  employee: accessControl.newRole({ teamwork: [] }),
  supervisor: accessControl.newRole({
    teamwork: managementPermissions.supervisor,
  }),
  operations_manager: accessControl.newRole({
    teamwork: managementPermissions.operations_manager,
  }),
  hr_manager: accessControl.newRole({
    teamwork: managementPermissions.hr_manager,
  }),
  // Administrators use both workspaces; resource and owner protections remain in services.
  admin: accessControl.newRole({ teamwork: permissionSchema.options }),
  owner: accessControl.newRole({ teamwork: permissionSchema.options }),
} satisfies Record<Role, unknown>

export function hasPermission(
  actorRoles: ReadonlyArray<Role>,
  permission: Permission,
) {
  // Also deny malformed runtime values from legacy/imported records.
  if (!permissionSchema.safeParse(permission).success) return false
  return actorRoles.some(
    (role) =>
      roleSchema.safeParse(role).success &&
      roles[role].authorize({ teamwork: [permission] }).success,
  )
}

export function hasEveryPermission(
  actorRoles: ReadonlyArray<Role>,
  permissions: ReadonlyArray<Permission>,
) {
  return (
    permissions.length > 0 &&
    permissions.every((permission) => hasPermission(actorRoles, permission))
  )
}

export function hasAnyPermission(
  actorRoles: ReadonlyArray<Role>,
  permissions: ReadonlyArray<Permission>,
) {
  return permissions.some((permission) => hasPermission(actorRoles, permission))
}
