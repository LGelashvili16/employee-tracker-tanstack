import { describe, expect, it } from 'vitest'
import { allowedJobTransitions, canManageJobs } from './jobs.rules'
import {
  hasPermission,
  permissionSchema,
} from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'

const employee: Actor = {
  id: 'worker-a',
  name: 'თანამშრომელი',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
const manager: Actor = { ...employee, id: 'manager', roles: ['sales_manager'] }
describe('shared map work policy', () => {
  it('gives the sales manager only job management and its navigation grant', () => {
    for (const permission of permissionSchema.options)
      expect(hasPermission(manager.roles, permission)).toBe(
        ['manage.access', 'jobs.manage'].includes(permission),
      )
    expect(canManageJobs(manager)).toBe(true)
    expect(canManageJobs({ ...employee, roles: ['admin'] })).toBe(false)
  })
  it('allows only production specialists and administrators to claim unassigned work', () => {
    for (const roles of [['production_specialist'], ['admin']] as const)
      expect(
        allowedJobTransitions(
          { ...employee, roles: [...roles] },
          { status: 'pending', assigneeId: null },
        ),
      ).toEqual(['en_route'])
    expect(
      allowedJobTransitions(
        { ...employee, roles: ['owner'] },
        { status: 'pending', assigneeId: null },
      ),
    ).toEqual(['en_route', 'rejected'])
    for (const roles of [['employee'], ['hr_manager']] as const)
      expect(
        allowedJobTransitions(
          { ...employee, roles: [...roles] },
          { status: 'pending', assigneeId: null },
        ),
      ).toEqual([])
    for (const roles of [
      ['sales_manager'],
      ['supervisor'],
      ['operations_manager'],
    ] as const)
      expect(
        allowedJobTransitions(
          { ...employee, roles: [...roles] },
          { status: 'pending', assigneeId: null },
        ),
      ).toEqual(['rejected'])
    expect(
      allowedJobTransitions(
        { ...manager, roles: ['sales_manager', 'production_specialist'] },
        { status: 'pending', assigneeId: null },
      ),
    ).toEqual(['en_route', 'rejected'])
  })
  it('restricts progress to the responsible employee and job managers', () => {
    const production: Actor = { ...employee, roles: ['production_specialist'] }
    expect(canManageJobs(production)).toBe(false)
    expect(
      allowedJobTransitions(production, {
        status: 'on_site',
        assigneeId: employee.id,
      }),
    ).toEqual(['completed', 'rejected'])
    expect(
      allowedJobTransitions(employee, {
        status: 'en_route',
        assigneeId: employee.id,
      }),
    ).toEqual(['on_site', 'rejected'])
    expect(
      allowedJobTransitions(employee, {
        status: 'on_site',
        assigneeId: employee.id,
      }),
    ).toEqual(['completed', 'rejected'])
    expect(
      allowedJobTransitions(employee, {
        status: 'on_site',
        assigneeId: 'another-worker',
      }),
    ).toEqual([])
    expect(
      allowedJobTransitions(manager, {
        status: 'on_site',
        assigneeId: 'another-worker',
      }),
    ).toContain('completed')
  })
  it('never skips arrival or permits employees to reopen terminal jobs', () => {
    expect(
      allowedJobTransitions(employee, {
        status: 'en_route',
        assigneeId: employee.id,
      }),
    ).not.toContain('completed')
    for (const status of ['completed', 'rejected'] as const) {
      expect(
        allowedJobTransitions(employee, { status, assigneeId: employee.id }),
      ).toEqual([])
      expect(
        allowedJobTransitions(manager, { status, assigneeId: employee.id }),
      ).toEqual(['pending'])
    }
  })
})
