// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeIp, requestIp } from './network.server'

vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('#/db', () => ({ db: {} }))
afterEach(() => vi.unstubAllEnvs())
describe('trusted exact client addresses', () => {
  it('canonicalizes IPv6 and IPv4-mapped addresses without accepting ranges or ports', () => {
    expect(normalizeIp('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe(
      '2001:db8::1',
    )
    expect(normalizeIp('::ffff:192.0.2.1')).toBe('192.0.2.1')
    expect(normalizeIp('::ffff:c000:201')).toBe('192.0.2.1')
    for (const value of [
      '192.0.2.1/24',
      '192.0.2.1:443',
      '192.0.2.1, 127.0.0.1',
      'example.com',
      '',
    ])
      expect(normalizeIp(value)).toBeNull()
  })
  it('ignores spoofed headers unless the deployment explicitly trusts one overwritten header', () => {
    vi.stubEnv('TEAM_ADWINGS_CLIENT_IP_HEADER', '')
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '192.0.2.1', 'x-real-ip': '198.51.100.1' },
    })
    expect(requestIp(request, '127.0.0.1')).toBe('127.0.0.1')
    expect(requestIp(request)).toBeNull()
    vi.stubEnv('TEAM_ADWINGS_CLIENT_IP_HEADER', 'x-real-ip')
    expect(requestIp(request, '127.0.0.1')).toBe('198.51.100.1')
    vi.stubEnv('TEAM_ADWINGS_CLIENT_IP_HEADER', 'x-forwarded-for')
    expect(() => requestIp(request)).toThrow()
  })
})
