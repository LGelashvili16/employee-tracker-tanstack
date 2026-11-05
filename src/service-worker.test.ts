import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

type NavigationMatcher = (input: {
  request: { method: string; mode: string }
  url: URL
}) => boolean
type NavigationHandler = (input: { request: Request }) => Promise<Response>

const workbox = vi.hoisted(() => ({
  registerRoute:
    vi.fn<(match: NavigationMatcher, handler: NavigationHandler) => void>(),
  precache: vi.fn(),
  matchPrecache: vi.fn(),
}))
vi.mock('workbox-core', () => ({
  clientsClaim: vi.fn(),
  setCacheNameDetails: vi.fn(),
}))
vi.mock('workbox-precaching', () => ({
  cleanupOutdatedCaches: vi.fn(),
  precacheAndRoute: workbox.precache,
  matchPrecache: workbox.matchPrecache,
}))
vi.mock('workbox-routing', () => ({ registerRoute: workbox.registerRoute }))

const workerScope = {
  location: new URL('https://teamwork.example/'),
  __WB_MANIFEST: [],
  addEventListener:
    vi.fn<
      (
        type: string,
        listener: (event: {
          data: unknown
          source: { url: string } | null
          waitUntil: (promise: Promise<void>) => void
        }) => void,
      ) => void
    >(),
  skipWaiting: vi.fn<() => Promise<void>>(),
}
const network = vi.fn<typeof fetch>()

beforeEach(async () => {
  vi.stubGlobal('self', workerScope)
  vi.resetModules()
  workbox.registerRoute.mockClear()
  workerScope.addEventListener.mockClear()
  workerScope.skipWaiting.mockResolvedValue(undefined)
  await import('./service-worker')
})

describe('PWA update messages', () => {
  function sendMessage(data: unknown, source: { url: string } | null) {
    const listener = workerScope.addEventListener.mock.calls.find(
      ([type]) => type === 'message',
    )?.[1]
    if (!listener) throw new Error('Worker message listener is missing')
    listener({ data, source, waitUntil: vi.fn() })
  }

  it.each([null, 'SKIP_WAITING', {}, { type: 'RELOAD' }])(
    'rejects malformed update messages: %j',
    (data) => {
      sendMessage(data, { url: 'https://teamwork.example/auth/login' })
      expect(workerScope.skipWaiting).not.toHaveBeenCalled()
    },
  )

  it('ignores update messages from other origins or without a client', () => {
    sendMessage({ type: 'SKIP_WAITING' }, { url: 'https://other.example/' })
    sendMessage({ type: 'SKIP_WAITING' }, null)
    expect(workerScope.skipWaiting).not.toHaveBeenCalled()
  })

  it('allows a validated update request from this app', () => {
    sendMessage(
      { type: 'SKIP_WAITING' },
      { url: 'https://teamwork.example/auth/login' },
    )
    expect(workerScope.skipWaiting).toHaveBeenCalledOnce()
  })
})
beforeEach(() => {
  vi.stubGlobal('fetch', network)
  network.mockReset()
  workbox.matchPrecache.mockReset()
})
afterAll(() => vi.unstubAllGlobals())

describe('PWA navigation privacy', () => {
  it.each([
    ['POST', 'navigate', 'https://teamwork.example/dashboard'],
    ['GET', 'cors', 'https://teamwork.example/dashboard'],
    ['GET', 'navigate', 'https://teamwork.example/api/auth/get-session'],
    ['GET', 'navigate', 'https://teamwork.example/_serverFn/session'],
    ['GET', 'navigate', 'https://other.example/dashboard'],
  ])('does not intercept %s %s %s', (method, mode, url) => {
    const [matches] = workbox.registerRoute.mock.calls[0]
    expect(matches({ request: { method, mode }, url: new URL(url) })).toBe(
      false,
    )
  })

  it('handles same-origin document navigation without mapping it to a cached app shell', () => {
    const [matches] = workbox.registerRoute.mock.calls[0]
    expect(
      matches({
        request: { method: 'GET', mode: 'navigate' },
        url: new URL('https://teamwork.example/manage/employees'),
      }),
    ).toBe(true)
    expect(workbox.precache).toHaveBeenCalledWith([], {
      cleanURLs: false,
      directoryIndex: '',
      ignoreURLParametersMatching: [],
    })
  })

  it('always requests fresh navigation responses, preserving authorization failures', async () => {
    const [, navigate] = workbox.registerRoute.mock.calls[0]
    const request = new Request('https://teamwork.example/manage/employees')
    const forbidden = new Response('Forbidden', { status: 403 })
    network.mockResolvedValue(forbidden)
    expect(await navigate({ request })).toBe(forbidden)
    expect(network).toHaveBeenCalledWith(request)
    expect(workbox.matchPrecache).not.toHaveBeenCalled()
  })

  it('returns only the static offline document when the network fails', async () => {
    const [, navigate] = workbox.registerRoute.mock.calls[0]
    const offline = new Response('Offline', {
      headers: { 'Content-Type': 'text/html' },
    })
    network.mockRejectedValue(new TypeError('Network unavailable'))
    workbox.matchPrecache.mockResolvedValue(offline)
    expect(
      await navigate({
        request: new Request('https://teamwork.example/dashboard'),
      }),
    ).toBe(offline)
    expect(workbox.matchPrecache).toHaveBeenCalledWith('/offline.html')
  })

  it('fails closed if the offline document is unavailable', async () => {
    const [, navigate] = workbox.registerRoute.mock.calls[0]
    network.mockRejectedValue(new TypeError('Network unavailable'))
    workbox.matchPrecache.mockResolvedValue(undefined)
    expect(
      (
        await navigate({
          request: new Request('https://teamwork.example/dashboard'),
        })
      ).type,
    ).toBe('error')
  })
})
