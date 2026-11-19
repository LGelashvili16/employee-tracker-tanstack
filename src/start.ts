import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start'
import { reportError } from '#/lib/error-diagnostics'

const csrfMiddleware = createCsrfMiddleware({
  filter: ({ handlerType }) => handlerType === 'serverFn',
  failureResponse: () => new Response('მოთხოვნა დაბლოკილია.', { status: 403 }),
})

const networkMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const { networkAccessResponse } =
      await import('#/features/attendance-security/server/network-access-page.server')
    try {
      const { currentRequestIp, networkAllowed } =
        await import('#/features/attendance-security/server/network.server')
      if (!(await networkAllowed(currentRequestIp(request))))
        return networkAccessResponse(request, 403)
    } catch (error) {
      const diagnostic = reportError('network-access', error, 503)
      return networkAccessResponse(request, 503, diagnostic)
    }
    return next()
  },
)

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, networkMiddleware],
}))
