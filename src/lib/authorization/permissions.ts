import { z } from 'zod'
import { createAccessControl } from 'better-auth/plugins/access'

export const permissionSchema = z.enum(
  [
    'manage.access',
    'attendance.read.team',
    'attendance.read.all',
    'attendance.review.team',
    'timesheets.review.team',
    'schedule.manage',
    'jobs.manage',
    'jobs.claim',
    'employees.read',
    'employees.manage',
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
    'production_specialist',
    'supervisor',
    'operations_manager',
    'sales_manager',
    'hr_manager',
    'admin',
    'owner',
  ],
  { error: 'როლი არასწორია.' },
)
export type Role = z.infer<typeof roleSchema>

export const permissionOverridesSchema = z
  .object(
    {
      allow: z
        .array(permissionSchema, { error: 'მიუთითეთ დასაშვები უფლებების სია.' })
        .max(permissionSchema.options.length, 'უფლებების რაოდენობა არასწორია.'),
      deny: z
        .array(permissionSchema, { error: 'მიუთითეთ აკრძალული უფლებების სია.' })
        .max(permissionSchema.options.length, 'უფლებების რაოდენობა არასწორია.'),
    },
    { error: 'ინდივიდუალური უფლებები არასწორია.' },
  )
  .refine(
    (value) =>
      !value.allow.some((permission) => value.deny.includes(permission)),
    { message: 'უფლება ერთდროულად დაშვებული და აკრძალული ვერ იქნება.' },
  )
export type PermissionOverrides = z.infer<typeof permissionOverridesSchema>
export type PermissionSubject =
  | ReadonlyArray<Role>
  | { roles: ReadonlyArray<Role>; permissionOverrides?: PermissionOverrides }

/** Invalid persisted exceptions deny every privileged operation rather than silently restoring role grants. */
export function parsePermissionOverrides(value: unknown): PermissionOverrides {
  if (value === undefined || value === null) return { allow: [], deny: [] }
  const parsed = permissionOverridesSchema.safeParse(value)
  return parsed.success
    ? parsed.data
    : { allow: [], deny: [...permissionSchema.options] }
}

export function currentAuthorization(value: {
  roles: string
  permissionOverrides?: unknown
}) {
  return {
    roles: parseRoles(value.roles),
    permissionOverrides: parsePermissionOverrides(value.permissionOverrides),
  }
}

const administrationPermissions = [
  'manage.access',
  'employees.read',
  'employees.manage',
  'jobs.claim',
  'attendance.read.all',
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
] as const satisfies ReadonlyArray<Permission>

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
    'reports.read',
  ],
  hr_manager: [
    'manage.access',
    'attendance.read.all',
    'attendance.configure',
    'attendance.read.team',
    'attendance.review.team',
    'timesheets.review.team',
    'employees.read',
    'employees.manage',
    'leave.review',
    'reports.read',
  ],
}
export const roleLabels: Record<Role, string> = {
  employee: 'თანამშრომელი',
  production_specialist: 'წარმოების სპეციალისტი',
  supervisor: 'ჯგუფის ხელმძღვანელი',
  operations_manager: 'ოპერაციების მენეჯერი',
  sales_manager: 'გაყიდვების მენეჯერი',
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
  production_specialist: accessControl.newRole({ teamwork: ['jobs.claim'] }),
  supervisor: accessControl.newRole({
    teamwork: managementPermissions.supervisor,
  }),
  operations_manager: accessControl.newRole({
    teamwork: managementPermissions.operations_manager,
  }),
  sales_manager: accessControl.newRole({
    teamwork: ['manage.access', 'jobs.manage'],
  }),
  hr_manager: accessControl.newRole({
    teamwork: managementPermissions.hr_manager,
  }),
  // Employee account management is explicit; attendance review and job management remain separate.
  admin: accessControl.newRole({ teamwork: administrationPermissions }),
  owner: accessControl.newRole({ teamwork: permissionSchema.options }),
} satisfies Record<Role, unknown>

export function hasPermission(
  subject: PermissionSubject,
  permission: Permission,
) {
  // Also deny malformed runtime values from legacy/imported records.
  if (!permissionSchema.safeParse(permission).success) return false
  const actorRoles = 'roles' in subject ? subject.roles : subject
  if ('roles' in subject && subject.permissionOverrides) {
    const overrides = parsePermissionOverrides(subject.permissionOverrides)
    if (overrides.deny.includes(permission)) return false
    if (overrides.allow.includes(permission)) return true
  }
  return actorRoles.some(
    (role) =>
      roleSchema.safeParse(role).success &&
      roles[role].authorize({ teamwork: [permission] }).success,
  )
}

export function hasEveryPermission(
  actorRoles: PermissionSubject,
  permissions: ReadonlyArray<Permission>,
) {
  return (
    permissions.length > 0 &&
    permissions.every((permission) => hasPermission(actorRoles, permission))
  )
}

export function hasAnyPermission(
  actorRoles: PermissionSubject,
  permissions: ReadonlyArray<Permission>,
) {
  return permissions.some((permission) => hasPermission(actorRoles, permission))
}
