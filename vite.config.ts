import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { pwaPlugins } from './scripts/pwa.ts'
import { serverFnDevLookup } from './scripts/server-fn-dev.ts'

const config = defineConfig({
  // Keep Start's optimizer artifacts separate from standalone local previews.
  cacheDir: 'node_modules/.vite/teamwork-start',
  optimizeDeps: {
    // Account management is lazy-loaded; prebundle Query before navigating there.
    include: ['@tanstack/react-query'],
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
