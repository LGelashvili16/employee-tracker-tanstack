import { hasEveryPermission, hasPermission } from './permissions'
import { AuthorizationError } from './authorization-error'
import type { Actor } from './actor'
import type { Permission } from './permissions'

export function assertPermission(actor: Actor, permission: Permission) {
  if (!hasPermission(actor, permission)) throw new AuthorizationError()
  return actor
}

/** All required grants may be supplied by different roles held by the same actor. */
export function assertPermissions(
  actor: Actor,
  permissions: ReadonlyArray<Permission>,
) {
  if (!hasEveryPermission(actor, permissions)) throw new AuthorizationError()
  return actor
}
