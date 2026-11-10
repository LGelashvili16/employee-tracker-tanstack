import { describe, expect, it } from 'vitest'
import { allowedJobTransitions, canManageJobs } from './jobs.rules'
import { hasPermission } from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'

const employee: Actor = {
  id: 'worker-a',
  name: 'თანამშრომელი',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
const manager: Actor = { ...employee, id: 'manager', roles: ['supervisor'] }
describe('shared map work policy', () => {
  it('lets the production lead manage jobs without granting platform access or job claiming', () => {
    expect(hasPermission(manager.roles, 'manage.access')).toBe(true)
    expect(hasPermission(manager.roles, 'admin.access')).toBe(false)
    expect(hasPermission(manager.roles, 'jobs.claim')).toBe(false)
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
    expect(
      allowedJobTransitions(manager, { status: 'pending', assigneeId: null }),
    ).toEqual(['rejected'])
    expect(
      allowedJobTransitions(
        { ...manager, roles: ['supervisor', 'production_specialist'] },
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
