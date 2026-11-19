import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { attendanceTaskConfig } from './scripts/attendance-task-config.ts'
import { pwaPlugins } from './scripts/pwa.ts'
import { serverFnDevLookup } from './scripts/server-fn-dev.ts'

const config = defineConfig({
  // Keep Start's optimizer artifacts separate from standalone local previews.
  cacheDir: 'node_modules/.vite/team-adwings-start',
  optimizeDeps: {
    // Lazy routes introduce Base UI subpaths after startup. Prebundle them together
    // so navigation does not invalidate dependencies already loaded by the browser.
    include: ['@tanstack/react-query', '@base-ui/react/**'],
  },
  resolve: {
    // Explicit filesystem aliases also resolve in Nitro's SSR module runner on Windows.
    alias: {
      '#': fileURLToPath(new URL('./src', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools(),
    nitro({
      ...attendanceTaskConfig,
      // Preserve the passkey library's module initialization order in production.
      traceDeps: ['@simplewebauthn/server*'],
      rollupConfig: { external: [/^@sentry\//] },
      routeRules: {
        '/service-worker.js': { headers: { 'Cache-Control': 'no-cache' } },
        '/manifest.webmanifest': { headers: { 'Cache-Control': 'no-cache' } },
        '/offline.html': { headers: { 'Cache-Control': 'no-cache' } },
      },
    }),
    tailwindcss(),
    serverFnDevLookup(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
    ...pwaPlugins(),
  ],
})

export default config
