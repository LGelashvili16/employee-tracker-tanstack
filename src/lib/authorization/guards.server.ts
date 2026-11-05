import '@tanstack/react-start/server-only'
import { setResponseStatus } from '@tanstack/react-start/server'
import { assertPermissions } from './access'
import { AuthorizationError } from './authorization-error'
import { readActor } from '#/lib/auth/session.server'
import type { Actor } from './actor'
import type { Permission } from './permissions'

export async function requireActor(): Promise<Actor> {
  const actor = await readActor()
  if (!actor) {
    setResponseStatus(401)
    throw new Error('გთხოვთ, გაიაროთ ავტორიზაცია.')
  }
  return actor
}

/** HTTP handlers must authenticate independently from page and function guards. */
export async function requirePermissions(
  ...permissions: [Permission, ...Array<Permission>]
) {
  const actor = await requireActor()
  return enforcePolicy(() => assertPermissions(actor, permissions))
}

/** Map policy denials at the transport boundary; persistence errors retain their meaning. */
export async function enforcePolicy<T>(
  policy: () => T | Promise<T>,
): Promise<T> {
  try {
    return await policy()
  } catch (error) {
    if (error instanceof AuthorizationError) {
      setResponseStatus(403)
    }
    throw error
  }
}
