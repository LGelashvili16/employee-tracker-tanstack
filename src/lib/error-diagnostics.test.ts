import { afterEach, expect, it, vi } from 'vitest'
import { AuthorizationError } from './authorization/authorization-error'
import { errorStatus, reportError } from './error-diagnostics'

afterEach(() => vi.restoreAllMocks())

it.each([401, 403, 404, 429, 503] as const)(
  'recognizes safe status %s without displaying arbitrary messages',
  (status) => {
    expect(errorStatus({ status, message: 'private details' })).toBe(status)
  },
)

it('recognizes permission errors and falls back safely for unknown failures', () => {
  expect(errorStatus(new AuthorizationError())).toBe(403)
  expect(errorStatus({ status: 418 })).toBe(500)
  expect(errorStatus(null)).toBe(500)
})

it('logs a correlated reference and safe diagnostic without error payloads', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const error = Object.assign(
    new Error('password=secret SQL employee details'),
    {
      code: 'ECONNREFUSED',
      cause: { token: 'secret' },
    },
  )
  const diagnostic = reportError('network-access', error, 503)
  expect(log).toHaveBeenCalledWith('[Team Adwings]', {
    source: 'network-access',
    ...diagnostic,
    status: 503,
    diagnostic: 'ECONNREFUSED',
  })
  expect(JSON.stringify(log.mock.calls)).not.toMatch(
    /password|SQL|employee|token|secret/,
  )
  expect(diagnostic.reference).toMatch(/^[a-f0-9-]{36}$/)
})

it('does not log arbitrary error codes', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  reportError('route', { code: 'sensitive employee data' })
  expect(JSON.stringify(log.mock.calls)).not.toContain(
    'sensitive employee data',
  )
})
