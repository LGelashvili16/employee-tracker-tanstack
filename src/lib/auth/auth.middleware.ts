import { createMiddleware } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { setResponseStatus } from '@tanstack/react-start/server'
import { readActor } from './session.server'
import { assertPermission } from '#/lib/authorization/access'
import type { Permission } from '#/lib/authorization/permissions'

export const sessionMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const actor = await readActor()
    if (!actor) throw redirect({ to: '/auth/login' })
    return next({ context: { actor } })
  },
)
/** Feature endpoints add resource-level policy checks after this common permission check. */
export function permissionMiddleware(permission: Permission) {
  return createMiddleware({ type: 'function' })
    .middleware([sessionMiddleware])
    .server(({ next, context }) => {
      try {
        assertPermission(context.actor, permission)
      } catch (error) {
        setResponseStatus(403)
        throw error
      }
      return next()
    })
}
