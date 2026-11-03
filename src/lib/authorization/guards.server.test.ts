import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  enforcePolicy,
  requireActor,
  requirePermissions,
} from './guards.server'
import { AuthorizationError } from './authorization-error'
import type { Actor } from './actor'

const mocks = vi.hoisted(() => ({
  readActor: vi.fn<() => Promise<Actor | null>>(),
  status: vi.fn(),
}))
vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('#/lib/auth/session.server', () => ({ readActor: mocks.readActor }))
vi.mock('@tanstack/react-start/server', () => ({
  setResponseStatus: mocks.status,
}))

const actor: Actor = {
  id: 'user',
  name: 'ტესტი',
  email: 'test@example.com',
  emailVerified: true,
  roles: ['employee'],
}

describe('direct server authorization guards', () => {
  beforeEach(() => vi.resetAllMocks())
  it('keeps direct administration access exclusive to admins and owners', async () => {
    mocks.readActor.mockResolvedValue(null)
    await expect(requirePermissions('admin.access')).rejects.toThrow(
      'ავტორიზაცია',
    )
    expect(mocks.status).toHaveBeenLastCalledWith(401)
    for (const role of [
      'employee',
      'supervisor',
      'operations_manager',
      'hr_manager',
    ] as const) {
      mocks.readActor.mockResolvedValue({ ...actor, roles: [role] })
      await expect(requirePermissions('admin.access')).rejects.toThrow(
        AuthorizationError,
      )
      expect(mocks.status).toHaveBeenLastCalledWith(403)
    }
    for (const role of ['admin', 'owner'] as const) {
      mocks.readActor.mockResolvedValue({ ...actor, roles: [role] })
      await expect(requirePermissions('admin.access')).resolves.toMatchObject({
        id: actor.id,
      })
    }
  })
  it('rejects anonymous calls with 401', async () => {
    mocks.readActor.mockResolvedValue(null)
    await expect(requirePermissions('users.manage')).rejects.toThrow(
      'ავტორიზაცია',
    )
    expect(mocks.status).toHaveBeenCalledWith(401)
  })
  it('rejects authenticated calls lacking a grant with 403', async () => {
    mocks.readActor.mockResolvedValue(actor)
    await expect(requirePermissions('users.manage')).rejects.toThrow(
      AuthorizationError,
    )
    expect(mocks.status).toHaveBeenCalledWith(403)
  })
  it('uses current grants on every call rather than retaining actor state', async () => {
    mocks.readActor
      .mockResolvedValueOnce({ ...actor, roles: ['admin'] })
      .mockResolvedValueOnce(actor)
    await expect(requirePermissions('users.manage')).resolves.toMatchObject({
      id: actor.id,
    })
    await expect(requirePermissions('users.manage')).rejects.toThrow(
      AuthorizationError,
    )
    expect(mocks.readActor).toHaveBeenCalledTimes(2)
  })
  it('returns a valid actor and requires every grant', async () => {
    mocks.readActor.mockResolvedValue({
      ...actor,
      roles: ['admin', 'supervisor'],
    })
    await expect(requireActor()).resolves.toMatchObject({ id: actor.id })
    await expect(
      requirePermissions('users.manage', 'timesheets.review.team'),
    ).resolves.toMatchObject({ id: actor.id })
  })
  it('maps async policy denials without masking database failures', async () => {
    await expect(
      enforcePolicy(async () => {
        throw new AuthorizationError()
      }),
    ).rejects.toThrow(AuthorizationError)
    expect(mocks.status).toHaveBeenCalledWith(403)
    mocks.status.mockClear()
    const error = new Error('database unavailable')
    await expect(
      enforcePolicy(() => {
        throw error
      }),
    ).rejects.toBe(error)
    expect(mocks.status).not.toHaveBeenCalled()
  })
})
