import { describe, expect, it } from 'vitest'
import { assertPermission } from './access'
import {
  hasAnyPermission,
  hasEveryPermission,
  hasPermission,
  parseRoles,
  permissionSchema,
} from './permissions'
import type { Actor } from './actor'

describe('role and permission boundaries', () => {
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
  it('grants admins the full workspace without expanding management roles', () => {
    expect(hasEveryPermission(['admin'], permissionSchema.options)).toBe(true)
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
    expect(hasEveryPermission(['admin'], required)).toBe(true)
    expect(hasAnyPermission(['supervisor'], required)).toBe(true)
    expect(hasAnyPermission(['employee'], required)).toBe(false)
  })
})
