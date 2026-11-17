import '@tanstack/react-start/server-only'
import { sql } from 'drizzle-orm'
import { assertPermissions } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  currentAuthorization,
  parsePermissionOverrides,
  parseRoles,
} from '#/lib/authorization/permissions'
import { user } from '#/db/schema'
import {
  adminAccountActionSchema,
  adminAccountListSchema,
  updateAccountAuthorizationSchema,
} from '../admin-access.schemas'
import { AccountWorkflowError } from './access.service.server'
import * as repository from './access.repository.server'
import type { Actor } from '#/lib/authorization/actor'

async function administrator(tx: repository.AccessTransaction, actor: Actor) {
  // Serialize access changes before taking actor/target locks to avoid cross-admin lock cycles.
  await tx.execute(sql`select pg_advisory_xact_lock(812736, 1)`)
  const record = await repository.lockedAccount(tx, actor.id)
  if (
    !record ||
    record.identity.accessState !== 'active' ||
    record.person?.status === 'inactive'
  )
    throw new AuthorizationError()
  const current = { ...actor, ...currentAuthorization(record.identity) }
  assertPermissions(current, ['admin.access', 'users.manage'])
  return current
}
function targetAllowed(actor: Actor, targetId: string, roles: string) {
  if (
    actor.id === targetId ||
    (parseRoles(roles).includes('owner') && !actor.roles.includes('owner'))
  )
    throw new AuthorizationError()
}
const normalized = (value: unknown) => {
  const parsed = parsePermissionOverrides(value)
  return JSON.stringify({
    allow: [...new Set(parsed.allow)].sort(),
    deny: [...new Set(parsed.deny)].sort(),
  })
}
export async function listAdminAccounts(actor: Actor, input: unknown) {
  assertPermissions(actor, ['admin.access', 'users.manage'])
  return repository.queryAdminAccounts(adminAccountListSchema.parse(input))
}
export async function updateAccountAuthorization(actor: Actor, input: unknown) {
  const data = updateAccountAuthorizationSchema.parse(input)
  return repository.transactAccounts(async (tx) => {
    const current = await administrator(tx, actor)
    assertPermissions(current, ['roles.manage'])
    const target = await repository.lockedAccount(tx, data.userId)
    if (!target) throw new AccountWorkflowError('ანგარიში ვერ მოიძებნა.')
    targetAllowed(current, data.userId, target.identity.roles)
    if (data.roles.includes('owner') && !current.roles.includes('owner'))
      throw new AuthorizationError()
    if (
      target.identity.roles !== data.expectedRoles ||
      normalized(target.identity.permissionOverrides) !==
        normalized(data.expectedOverrides)
    )
      throw new AccountWorkflowError(
        'უფლებები შეიცვალა. განაახლეთ სია და სცადეთ ხელახლა.',
      )
    const roles = [...new Set(data.roles)].sort().join(',')
    const permissionOverrides = {
      allow: [...new Set(data.permissionOverrides.allow)],
      deny: [...new Set(data.permissionOverrides.deny)],
    }
    await tx
      .update(user)
      .set({ roles, permissionOverrides })
      .where(sql`${user.id} = ${data.userId}`)
    await repository.revokeAccess(tx, data.userId)
    await repository.auditAccess(tx, {
      actorId: current.id,
      targetId: data.userId,
      action: 'account.authorization_updated',
      reason: data.reason,
    })
  })
}
export async function administerAccount(actor: Actor, input: unknown) {
  const data = adminAccountActionSchema.parse(input)
  return repository.transactAccounts(async (tx) => {
    const current = await administrator(tx, actor)
    const target = await repository.lockedAccount(tx, data.userId)
    if (!target) throw new AccountWorkflowError('ანგარიში ვერ მოიძებნა.')
    targetAllowed(current, data.userId, target.identity.roles)
    if (data.action === 'restore') {
      if (
        target.identity.accessState !== 'suspended' ||
        target.person?.status === 'inactive'
      )
        throw new AccountWorkflowError(
          'ანგარიშის აღდგენა ამ სტატუსით შეუძლებელია.',
        )
      await repository.updateIdentity(
        tx,
        data.userId,
        target.identity.activatedAt || !target.person ? 'active' : 'invited',
      )
    }
    if (data.action === 'suspend') {
      if (target.identity.accessState === 'suspended')
        throw new AccountWorkflowError('ანგარიში უკვე შეჩერებულია.')
      await repository.updateIdentity(tx, data.userId, 'suspended')
    }
    // Also remove outstanding setup codes; access changes must not leave a valid old recovery capability.
    await repository.revokeAccess(tx, data.userId)
    await repository.auditAccess(tx, {
      actorId: current.id,
      targetId: data.userId,
      action: `account.${data.action}`,
      reason: data.reason,
    })
  })
}
