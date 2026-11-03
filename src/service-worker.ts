/// <reference lib="webworker" />
import { clientsClaim, setCacheNameDetails } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute,
} from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import type { PrecacheEntry } from 'workbox-precaching'
import { workerMessageSchema } from './lib/pwa/pwa.schemas'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>
}

setCacheNameDetails({ prefix: 'teamwork', suffix: 'public-v1' })
cleanupOutdatedCaches()

// Only explicitly listed build assets enter this cache. Never cache SSR or API data.
precacheAndRoute(self.__WB_MANIFEST, {
  cleanURLs: false,
  directoryIndex: '',
  ignoreURLParametersMatching: [],
})

registerRoute(
  ({ request, url }) =>
    request.method === 'GET' &&
    request.mode === 'navigate' &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/_serverFn/'),
  async ({ request }) => {
    try {
      // Preserve server redirects, session checks, and errors on every navigation.
      return await fetch(request)
    } catch {
      return (await matchPrecache('/offline.html')) ?? Response.error()
    }
  },
)

// Updates wait until the user explicitly accepts the prompt in an open app tab.
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (
    event.source &&
    'url' in event.source &&
    new URL(event.source.url).origin === self.location.origin &&
    workerMessageSchema.safeParse(event.data).success
  ) {
    event.waitUntil(self.skipWaiting())
  }
})

clientsClaim()
