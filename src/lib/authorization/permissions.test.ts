import { describe, expect, it } from 'vitest'
import { assertPermission } from './access'
import {
  hasAnyPermission,
  hasEveryPermission,
  hasPermission,
  parseRoles,
  permissionSchema,
  parsePermissionOverrides,
  permissionOverridesSchema,
} from './permissions'
import type { Actor } from './actor'

describe('role and permission boundaries', () => {
  it('grants vacation review to HR, admins, and owners, with explicit denials taking precedence', () => {
    for (const role of ['hr_manager', 'admin', 'owner'] as const)
      expect(hasPermission([role], 'leave.review')).toBe(true)
    for (const role of [
      'employee',
      'production_specialist',
      'supervisor',
      'operations_manager',
      'sales_manager',
    ] as const)
      expect(hasPermission([role], 'leave.review')).toBe(false)
    expect(
      hasPermission(
        {
          roles: ['admin'],
          permissionOverrides: { allow: [], deny: ['leave.review'] },
        },
        'leave.review',
      ),
    ).toBe(false)
  })
  it('rejects the retired team-management permission', () => {
    expect(permissionSchema.safeParse('teams.manage').success).toBe(false)
  })
  it('applies per-user grants and denials consistently across role and all-permission checks', () => {
    const employee = {
      roles: ['employee'] as const,
      permissionOverrides: {
        allow: ['manage.access', 'jobs.manage'] as const,
        deny: [],
      },
    }
    expect(
      hasPermission(
        {
          ...employee,
          permissionOverrides: {
            allow: [...employee.permissionOverrides.allow],
            deny: [],
          },
        },
        'jobs.manage',
      ),
    ).toBe(true)
    const admin = {
      roles: ['admin'] as const,
      permissionOverrides: {
        allow: [],
        deny: ['admin.access'] as Array<'admin.access'>,
      },
    }
    expect(hasPermission(admin, 'admin.access')).toBe(false)
    expect(hasEveryPermission(admin, ['admin.access', 'users.manage'])).toBe(
      false,
    )
    expect(
      hasPermission(
        {
          roles: ['owner'],
          permissionOverrides: parsePermissionOverrides({
            allow: ['unknown'],
            deny: [],
          }),
        },
        'users.manage',
      ),
    ).toBe(false)
    expect(
      permissionOverridesSchema.safeParse({
        allow: ['jobs.manage'],
        deny: ['jobs.manage'],
      }).success,
    ).toBe(false)
  })
  it('does not grant privileged access to employees or malformed stored roles', () => {
    for (const roles of [
      parseRoles('employee'),
      parseRoles(''),
      parseRoles('employee,superadmin'),
    ]) {
      for (const permission of permissionSchema.options)
        expect(hasPermission(roles, permission)).toBe(false)
    }
  })
  it('gives production specialists only the explicit job-claim grant', () => {
    for (const permission of permissionSchema.options)
      expect(hasPermission(['production_specialist'], permission)).toBe(
        permission === 'jobs.claim',
      )
  })
  it('grants administrators platform configuration, company reads, and vacation review', () => {
    const platformPermissions = [
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
      'leave.review',
      'security.configure',
      'notifications.configure',
      'locations.manage',
      'integrations.manage',
      'audit.read',
    ] as const
    for (const permission of permissionSchema.options) {
      expect(hasPermission(['admin'], permission)).toBe(
        platformPermissions.some((platform) => platform === permission),
      )
    }
    expect(hasPermission(['supervisor'], 'timesheets.review.team')).toBe(true)
    expect(hasPermission(['supervisor'], 'roles.manage')).toBe(false)
  })
  it('combines explicit grants without adding unrelated permissions', () => {
    expect(parseRoles('employee,supervisor,supervisor')).toEqual([
      'employee',
      'supervisor',
    ])
    expect(
      hasPermission(['admin', 'supervisor'], 'timesheets.review.team'),
    ).toBe(true)
    expect(hasPermission(['operations_manager'], 'employees.manage')).toBe(
      false,
    )
  })
  it('lets HR manage employees without granting platform or role administration', () => {
    expect(
      hasEveryPermission(['hr_manager'], ['manage.access', 'employees.manage']),
    ).toBe(true)
    for (const permission of [
      'admin.access',
      'users.manage',
      'roles.manage',
    ] as const)
      expect(hasPermission(['hr_manager'], permission)).toBe(false)
    expect(
      hasEveryPermission(
        ['hr_manager'],
        ['attendance.read.all', 'attendance.configure'],
      ),
    ).toBe(true)
  })
  it('rejects an unauthorized direct access check', () => {
    const actor: Actor = {
      id: 'test-user',
      name: 'ტესტი',
      email: 'test@example.com',
      emailVerified: true,
      roles: ['employee'],
    }
    expect(() => assertPermission(actor, 'users.manage')).toThrow('წვდომა')
    expect(permissionSchema.safeParse('payroll.export').success).toBe(false)
  })
  it('requires explicit grants even for owners and denies empty permission checks', () => {
    expect(hasEveryPermission(['owner'], [])).toBe(false)
    expect(hasAnyPermission(['owner'], [])).toBe(false)
    // @ts-expect-error Exercise invalid runtime input beyond the typed interface.
    expect(hasPermission(['owner'], 'unknown')).toBe(false)
    // @ts-expect-error Exercise invalid persisted roles beyond the typed interface.
    expect(hasPermission(['unknown'], 'users.manage')).toBe(false)
    expect(hasEveryPermission(['owner'], permissionSchema.options)).toBe(true)
  })
  it('combines grants across roles for all/any checks', () => {
    const required = ['users.manage', 'timesheets.review.team'] as const
    expect(hasEveryPermission(['admin', 'supervisor'], required)).toBe(true)
    expect(hasEveryPermission(['admin'], required)).toBe(false)
    expect(hasAnyPermission(['supervisor'], required)).toBe(true)
    expect(hasAnyPermission(['employee'], required)).toBe(false)
  })
})
