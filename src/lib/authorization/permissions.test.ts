import { describe, expect, it } from 'vitest'
import { assertPermission } from './access'
import { hasPermission, parseRoles, permissionSchema } from './permissions'
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
  it('keeps system administration separate from team approvals', () => {
    expect(hasPermission(['admin'], 'users.manage')).toBe(true)
    expect(hasPermission(['admin'], 'timesheets.review.team')).toBe(false)
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
})
