import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import './start'

type Middleware = (input: {
  request: Request
  next: () => Promise<Response>
}) => Promise<Response>
const calls = vi.hoisted(() => ({
  middleware: vi.fn<Middleware>(),
  networkAllowed: vi.fn(),
  currentRequestIp: vi.fn(),
}))
vi.mock('@tanstack/react-start', () => ({
  createCsrfMiddleware: () => ({}),
  createMiddleware: () => ({
    server: (handler: Middleware) => {
      calls.middleware.mockImplementation(handler)
      return {}
    },
  }),
  createStart: (options: () => unknown) => options(),
}))
vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('#/features/attendance-security/server/network.server', () => ({
  networkAllowed: calls.networkAllowed,
  currentRequestIp: calls.currentRequestIp,
}))

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  calls.networkAllowed.mockReset().mockResolvedValue(false)
  calls.currentRequestIp.mockReset().mockReturnValue('127.0.0.1')
})
afterEach(() => vi.restoreAllMocks())
const request = (
  headers: Record<string, string> = { accept: 'text/html' },
  method = 'GET',
) => new Request('http://localhost/dashboard', { headers, method })
it.each([403, 503] as const)(
  'renders an independent, private HTML error document with status %s',
  async (status) => {
    if (status === 503)
      calls.networkAllowed.mockRejectedValue(
        new Error('private database details'),
      )
    const next = vi.fn()
    const response = await calls.middleware({ request: request(), next })
    expect(response.status).toBe(status)
    expect(next).not.toHaveBeenCalled()
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('content-security-policy')).toContain(
      "default-src 'none'",
    )
    const html = await response.text()
    const page = new DOMParser().parseFromString(html, 'text/html')
    expect(page.documentElement.lang).toBe('ka')
    expect(page.title).toContain('Teamwork')
    expect(page.querySelector('h1')?.textContent).toBe(
      status === 403
        ? 'ამ ქსელიდან წვდომა შეზღუდულია'
        : 'წვდომა დროებით მიუწვდომელია',
    )
    expect(page.querySelector('a')?.getAttribute('href')).toBe('')
    expect(page.querySelector('a')?.textContent).toBe('ხელახლა ცდა')
    expect(page.querySelector('[data-slot="card"]')).not.toBeNull()
    expect(page.querySelector('script, link, img')).toBeNull()
    expect(page.querySelector('style')?.textContent).toContain(
      'prefers-color-scheme:dark',
    )
    expect(html).not.toContain('private database details')
    expect(html).not.toContain('127.0.0.1')
    if (status === 503) {
      const reference = response.headers.get('x-error-reference')
      expect(reference).toMatch(/^[a-f0-9-]{36}$/)
      expect(html).toContain(reference)
      expect(response.headers.get('retry-after')).toBe('30')
      expect(console.error).toHaveBeenCalledWith(
        '[Teamwork]',
        expect.objectContaining({
          reference,
          status: 503,
          source: 'network-access',
        }),
      )
    }
  },
)
it.each([
  [{ accept: 'application/json' }, 'GET'],
  [{ accept: 'text/html', 'sec-fetch-dest': 'empty' }, 'GET'],
  [{ accept: 'text/html' }, 'POST'],
] as const)(
  'preserves non-document failures for %j %s',
  async (headers, method) => {
    const response = await calls.middleware({
      request: request(headers, method),
      next: vi.fn(),
    })
    expect(response.status).toBe(403)
    expect(response.headers.get('content-type')).toContain('text/plain')
    expect(await response.text()).toBe('ამ ქსელიდან წვდომა აკრძალულია.')
  },
)
it('returns an empty body for HEAD and keeps the HTTP status', async () => {
  const response = await calls.middleware({
    request: request({ accept: 'text/html' }, 'HEAD'),
    next: vi.fn(),
  })
  expect(response.status).toBe(403)
  expect(await response.text()).toBe('')
})
it('continues allowed requests without rendering the error document', async () => {
  calls.networkAllowed.mockResolvedValue(true)
  const expected = new Response('allowed')
  const next = vi.fn().mockResolvedValue(expected)
  expect(await calls.middleware({ request: request(), next })).toBe(expected)
  expect(next).toHaveBeenCalledOnce()
})
it('shows temporary failure if IP extraction fails instead of denying the account', async () => {
  calls.currentRequestIp.mockImplementation(() => {
    throw new Error('invalid private setting')
  })
  const response = await calls.middleware({ request: request(), next: vi.fn() })
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('invalid private setting')
})
