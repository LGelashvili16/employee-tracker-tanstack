import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readActor, readActorFromHeaders } from './session.server'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  header: vi.fn(),
  headers: new Headers(),
  loginAccess: vi.fn(),
}))
vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('./auth', () => ({ auth: { api: { getSession: mocks.getSession } } }))
vi.mock('#/features/access/server/access.service.server', () => ({
  getLoginAccess: mocks.loginAccess,
}))
vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeaders: () => mocks.headers,
  setResponseHeader: mocks.header,
}))

describe('trusted actor projection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.loginAccess.mockResolvedValue({ allowed: true, contactEmail: null })
  })
  it('bypasses cookie snapshots and returns no actor for a revoked session', async () => {
    mocks.getSession.mockResolvedValue(null)
    expect(await readActor()).toBeNull()
    expect(mocks.getSession).toHaveBeenCalledWith({
      headers: mocks.headers,
      query: { disableCookieCache: true },
    })
    expect(mocks.header).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    )
  })
  it('checks a stream session without refreshing it or writing response headers', async () => {
    mocks.getSession.mockResolvedValue(null)
    const headers = new Headers()
    expect(await readActorFromHeaders(headers, true)).toBeNull()
    expect(mocks.getSession).toHaveBeenCalledWith({
      headers,
      query: { disableCookieCache: true, disableRefresh: true },
    })
    expect(mocks.header).not.toHaveBeenCalled()
  })
  it('projects safe fields and denies malformed persisted grants', async () => {
    mocks.getSession.mockResolvedValue({
      session: { token: 'private-test-value' },
      user: {
        id: 'user',
        name: 'ტესტი',
        email: 'test@example.com',
        emailVerified: true,
        roles: 'admin,unknown',
        privateField: 'private',
      },
    })
    expect(await readActor()).toEqual({
      id: 'user',
      name: 'ტესტი',
      email: 'test@example.com',
      emailVerified: true,
      roles: [],
      permissionOverrides: { allow: [], deny: [] },
    })
  })
  it('rejects an existing session when account or employment access is suspended', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user' } })
    mocks.loginAccess.mockResolvedValue({ allowed: false, contactEmail: null })
    expect(await readActor()).toBeNull()
  })
  it('exposes optional real contact email instead of the internal auth identifier', async () => {
    mocks.getSession.mockResolvedValue({
      user: {
        id: 'user',
        name: 'ტესტი',
        email: 'worker@accounts.teamwork.invalid',
        emailVerified: false,
        roles: 'employee',
      },
    })
    expect((await readActor())?.email).toBeNull()
  })
  it('uses current persisted permission exceptions rather than values carried by the auth response', async () => {
    mocks.getSession.mockResolvedValue({
      user: {
        id: 'user',
        name: 'ტესტი',
        email: 'test@example.com',
        emailVerified: true,
        roles: 'employee',
        permissionOverrides: { allow: ['admin.access'], deny: [] },
      },
    })
    mocks.loginAccess.mockResolvedValue({
      allowed: true,
      contactEmail: null,
      permissionOverrides: { allow: ['jobs.manage'], deny: ['admin.access'] },
    })
    expect((await readActor())?.permissionOverrides).toEqual({
      allow: ['jobs.manage'],
      deny: ['admin.access'],
    })
  })
})
