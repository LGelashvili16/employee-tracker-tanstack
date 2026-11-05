import { createMiddleware } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { readActor } from './session.server'
import { enforcePolicy, requireActor } from '#/lib/authorization/guards.server'
import { assertPermissions } from '#/lib/authorization/access'
import type { Permission } from '#/lib/authorization/permissions'

export const sessionMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const actor = await readActor()
    if (!actor) throw redirect({ to: '/auth/login' })
    return next({ context: { actor } })
  },
)

/** Mutations and data reads return 401 rather than relying on navigation redirects. */
export const authenticatedMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) =>
  next({ context: { actor: await requireActor() } }),
)

/** Feature endpoints add resource-level policy checks after this common permission check. */
export function permissionMiddleware(permission: Permission) {
  return permissionsMiddleware(permission)
}

export function permissionsMiddleware(
  ...permissions: [Permission, ...Array<Permission>]
) {
  return createMiddleware({ type: 'function' })
    .middleware([authenticatedMiddleware])
    .server(async ({ next, context }) => {
      await enforcePolicy(() => assertPermissions(context.actor, permissions))
      return next()
    })
}
