import { hasPermission } from './permissions'
import type { Actor } from './actor'
import type { Permission } from './permissions'

export function assertPermission(actor: Actor, permission: Permission) {
  if (!hasPermission(actor.roles, permission))
    throw new Error('ამ განყოფილებაზე წვდომა არ გაქვთ.')
  return actor
}
