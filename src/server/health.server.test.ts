import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkDatabaseReadiness } from './health.server'

const { connect, query, release } = vi.hoisted(() => ({
  connect: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
}))

vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('#/db', () => ({ db: { $client: { connect } } }))

describe('database readiness', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    connect.mockResolvedValue({ query, release })
  })

  it('releases the connection after a successful probe', async () => {
    await checkDatabaseReadiness()
    expect(query).toHaveBeenCalledWith({
      text: 'select 1',
      query_timeout: 1500,
    })
    expect(release).toHaveBeenCalledOnce()
  })

  it('releases the connection when the database query fails', async () => {
    query.mockRejectedValue(new Error('database unavailable'))
    await expect(checkDatabaseReadiness()).rejects.toThrow()
    expect(release).toHaveBeenCalledOnce()
  })

  it('reports pool acquisition failure without attempting a query', async () => {
    connect.mockRejectedValue(new Error('connection timed out'))
    await expect(checkDatabaseReadiness()).rejects.toThrow()
    expect(query).not.toHaveBeenCalled()
    expect(release).not.toHaveBeenCalled()
  })
})
