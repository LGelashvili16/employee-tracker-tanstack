import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { ManifestOptions } from 'vite-plugin-pwa'
import { APP_NAME } from '../src/lib/app.ts'
import { offlinePage } from '../src/lib/pwa/offline-page.ts'

const manifest = {
  id: '/',
  name: APP_NAME,
  short_name: APP_NAME,
  description: 'ერთი სივრცე თქვენი სამუშაო დღის სამართავად.',
  lang: 'ka',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  theme_color: '#1c1c1c',
  background_color: '#f7f7f7',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    {
      src: '/icons/maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
} satisfies Partial<ManifestOptions>

export function pwaPlugins() {
  const offlineDocument: Plugin = {
    name: 'teamwork-pwa-documents',
    generateBundle() {
      if (this.environment.name === 'client') {
        this.emitFile({
          type: 'asset',
          fileName: 'offline.html',
          source: offlinePage,
        })
      }
    },
    configureServer(server) {
      // Serve install metadata in development without enabling a service worker.
      server.middlewares.use('/manifest.webmanifest', (_request, response) => {
        response.setHeader(
          'Content-Type',
          'application/manifest+json; charset=utf-8',
        )
        response.setHeader('Cache-Control', 'no-cache')
        response.end(JSON.stringify(manifest))
      })
      server.middlewares.use('/offline.html', (_request, response) => {
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.end(offlinePage)
      })
    },
  }

  return [
    offlineDocument,
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      // Start owns the HTML document, so link the manifest and register in React.
      injectRegister: false,
      registerType: 'prompt',
      scope: '/',
      outDir: '.output/public',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest,
      injectManifest: {
        globDirectory: '.output/public',
        globPatterns: ['assets/**/*.{js,css,woff2}', 'offline.html'],
        globIgnores: ['**/service-worker.js'],
      },
      devOptions: { enabled: false },
    }),
  ]
}
