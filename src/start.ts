import { createMiddleware, createStart } from '@tanstack/react-start'

const networkMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const { currentRequestIp, networkAllowed } =
      await import('#/features/attendance-security/server/network.server')
    try {
      if (!(await networkAllowed(currentRequestIp(request))))
        return new Response('ამ ქსელიდან წვდომა აკრძალულია.', {
          status: 403,
          headers: { 'Cache-Control': 'private, no-store' },
        })
    } catch {
      return new Response('წვდომის შემოწმება დროებით მიუწვდომელია.', {
        status: 503,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }
    return next()
  },
)

export const startInstance = createStart(() => ({
  requestMiddleware: [networkMiddleware],
}))
