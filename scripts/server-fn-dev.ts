import type { Plugin } from 'vite'

export function serverFnDevLookup(): Plugin {
  const lookupSuffix = '?server-fn-module-lookup'

  return {
    name: 'teamwork-server-fn-dev-lookup',
    apply: 'serve',
    enforce: 'pre',
    load: {
      filter: { id: /\?server-fn-module-lookup$/ },
      async handler(id) {
        if (this.environment.mode !== 'dev') return null
        // Work around Start plugin 1.171.55's cold lookup not registering function IDs.
        await this.environment.transformRequest(
          id.slice(0, -lookupSuffix.length),
        )
        return null
      },
    },
  }
}
