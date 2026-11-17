import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        const headers = { 'Cache-Control': 'no-store' }
        try {
          const { checkDatabaseReadiness } =
            await import('#/server/health.server')
          await checkDatabaseReadiness()
          return Response.json({ status: 'ok' }, { headers })
        } catch {
          // Public infrastructure probe: never return database or auth details.
          return Response.json(
            { status: 'unavailable' },
            { status: 503, headers },
          )
        }
      },
    },
  },
})
