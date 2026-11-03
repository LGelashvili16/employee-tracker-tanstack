import '@tanstack/react-start/server-only'
import { createHash, randomBytes } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { user } from '#/db/schema'
import { assertPermissions } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { parseRoles } from '#/lib/authorization/permissions'
import { provisionIdentity } from '#/lib/auth/provisioning.server'
import {
  accountActionSchema,
  accountListSchema,
  completeAccountSchema,
  provisionAccountSchema,
  ownerRecoverySchema,
} from '../access.schemas'
import * as repository from './access.repository.server'
import type { Actor } from '#/lib/authorization/actor'
import type { z } from 'zod'
import type { Role } from '#/lib/authorization/permissions'

export class AccountWorkflowError extends Error {}
const invalidCode = () =>
  new AccountWorkflowError('კოდი არასწორია, ვადაგასულია ან უკვე გამოყენებულია.')
export const hashSetupCode = (code: string) =>
  createHash('sha256').update(code).digest('hex')
export const getLoginAccess = repository.readAccountAccess

async function currentAdministrator(
  tx: repository.AccessTransaction,
  actor: Actor,
) {
  const record = await repository.lockedAccount(tx, actor.id)
  if (
    !record ||
    record.identity.accessState !== 'active' ||
    (record.person && record.person.status !== 'active')
  )
    throw new AuthorizationError()
  const current = { ...actor, roles: parseRoles(record.identity.roles) }
  assertPermissions(current, ['admin.access', 'users.manage'])
  return current
}

function checkTarget(actor: Actor, id: string, roles: Array<Role>) {
  if (actor.id === id) throw new AuthorizationError()
  if (
    roles.some((role) => role === 'admin' || role === 'owner') &&
    !actor.roles.includes('owner')
  )
    throw new AuthorizationError()
}

async function issueChallenge(
  tx: repository.AccessTransaction,
  userId: string,
  issuer: string | null,
  purpose: 'activation' | 'reset',
) {
  const code = randomBytes(32).toString('base64url')
  const expiresAt = new Date(
    Date.now() + (purpose === 'activation' ? 24 * 60 : 15) * 60_000,
  )
  await repository.storeChallenge(tx, {
    userId,
    codeHash: hashSetupCode(code),
    purpose,
    expiresAt,
    issuedBy: issuer,
  })
  return { code, expiresAt: expiresAt.toISOString(), purpose }
}

async function createEmployee(
  tx: repository.AccessTransaction,
  input: z.infer<typeof provisionAccountSchema>,
  actorId: string | null,
  role: Role,
) {
  const userId = await provisionIdentity(tx, input.name, input.code)
  await repository.insertEmployee(tx, {
    code: input.code,
    userId,
    fullName: input.name,
    contactEmail: input.contactEmail || null,
  })
  await tx
    .update(user)
    .set({ roles: role })
    .where(sql`${user.id} = ${userId}`)
  await repository.updateIdentity(tx, userId, 'invited', null)
  const challenge = await issueChallenge(tx, userId, actorId, 'activation')
  await repository.auditAccess(tx, {
    actorId,
    targetId: userId,
    action: `account.provisioned.${role}`,
    reason: input.reason,
  })
  return challenge
}

export async function provisionEmployee(
  actor: Actor,
  untrusted: z.infer<typeof provisionAccountSchema>,
) {
  const input = provisionAccountSchema.parse(untrusted)
  return repository.transactAccounts(async (tx) => {
    const administrator = await currentAdministrator(tx, actor)
    if (input.role !== 'employee')
      assertPermissions(administrator, ['roles.manage'])
    return createEmployee(tx, input, administrator.id, input.role)
  })
}

export async function listEmployeeAccounts(
  actor: Actor,
  untrusted: z.infer<typeof accountListSchema>,
) {
  assertPermissions(actor, ['admin.access', 'users.manage'])
  const { page } = accountListSchema.parse(untrusted)
  return repository.queryAccounts(page)
}

export async function manageEmployeeAccount(
  actor: Actor,
  untrusted: z.infer<typeof accountActionSchema>,
) {
  const input = accountActionSchema.parse(untrusted)
  return repository.transactAccounts(async (tx) => {
    const administrator = await currentAdministrator(tx, actor)
    const target = await repository.lockedAccount(tx, input.userId)
    if (!target?.person)
      throw new AccountWorkflowError('თანამშრომლის ანგარიში ვერ მოიძებნა.')
    checkTarget(administrator, input.userId, parseRoles(target.identity.roles))
    let challenge: Awaited<ReturnType<typeof issueChallenge>> | null = null
    if (input.action === 'issue_activation' || input.action === 'issue_reset') {
      const activation = input.action === 'issue_activation'
      const expected = activation ? 'invited' : 'active'
      if (
        target.identity.accessState !== expected ||
        target.person.status !== 'active'
      )
        throw new AccountWorkflowError(
          'ანგარიშის მიმდინარე სტატუსი ამ მოქმედებას არ უშვებს.',
        )
      challenge = await issueChallenge(
        tx,
        input.userId,
        administrator.id,
        activation ? 'activation' : 'reset',
      )
    } else if (input.action === 'suspend') {
      // Suspending login access does not terminate employment or change HR records.
      await repository.updateIdentity(tx, input.userId, 'suspended')
      await repository.revokeAccess(tx, input.userId)
    } else {
      if (target.identity.accessState !== 'suspended')
        throw new AccountWorkflowError('ანგარიში შეჩერებული არ არის.')
      if (target.person.status !== 'active')
        throw new AccountWorkflowError(
          'ანგარიშის აღდგენამდე საჭიროა დასაქმების სტატუსის აღდგენა.',
        )
      await repository.updateIdentity(
        tx,
        input.userId,
        target.identity.activatedAt ? 'active' : 'invited',
      )
    }
    await repository.auditAccess(tx, {
      actorId: administrator.id,
      targetId: input.userId,
      action: `account.${input.action}`,
      reason: input.reason,
    })
    return challenge
  })
}

/** Called by a Better Auth endpoint; hashing uses its configured password implementation. */
export async function completeEmployeeSetup(
  input: z.infer<typeof completeAccountSchema>,
  purpose: 'activation' | 'reset',
  hashPassword: (password: string) => Promise<string>,
) {
  const parsed = completeAccountSchema.parse(input)
  const hash = hashSetupCode(parsed.code)
  const candidate = await repository.lookupChallenge(hash)
  if (!candidate) throw invalidCode()
  const passwordHash = await hashPassword(parsed.newPassword)
  await repository.transactAccounts(async (tx) => {
    // Always lock the user before the challenge, matching issue/suspend lock order.
    const target = await repository.lockedAccount(tx, candidate.userId)
    if (
      !target?.person ||
      target.person.status !== 'active' ||
      target.identity.accessState !==
        (purpose === 'activation' ? 'invited' : 'active')
    )
      throw invalidCode()
    if (
      !(await repository.consumeChallenge(tx, candidate.userId, hash, purpose))
    )
      throw invalidCode()
    await repository.replacePassword(tx, candidate.userId, passwordHash)
    await repository.updateIdentity(
      tx,
      candidate.userId,
      'active',
      target.identity.activatedAt ?? new Date(),
    )
    await repository.auditAccess(tx, {
      actorId: candidate.userId,
      targetId: candidate.userId,
      action:
        purpose === 'activation'
          ? 'account.activated'
          : 'account.password_reset',
      reason: 'ადმინისტრატორის მიერ გაცემული ერთჯერადი კოდის გამოყენება.',
    })
  })
}

/** Operator-only entry point. No route or server-function exposes first-owner creation. */
export async function bootstrapOwner(
  untrusted: Pick<
    z.infer<typeof provisionAccountSchema>,
    'code' | 'name' | 'contactEmail'
  >,
) {
  const input = provisionAccountSchema.parse({
    ...untrusted,
    role: 'employee',
    reason: 'კომპანიის პირველი მფლობელის პირველადი შექმნა.',
  })
  return repository.transactAccounts(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('teamwork-owner-bootstrap'))`,
    )
    const privileged = await tx
      .select({ id: user.id })
      .from(user)
      .where(sql`${user.roles} ~ '(^|,)(admin|owner)(,|$)'`)
      .limit(1)
    if (privileged.length)
      throw new AccountWorkflowError(
        'პრივილეგირებული ანგარიში უკვე არსებობს. გამოიყენეთ ანგარიშების მართვის გვერდი.',
      )
    return createEmployee(tx, input, null, 'owner')
  })
}

/** Database operators can recover an existing owner without creating another identity. Never expose this as an application endpoint. */
export async function recoverOwnerCode(
  untrusted: z.infer<typeof ownerRecoverySchema>,
) {
  const input = ownerRecoverySchema.parse(untrusted)
  const id = await repository.userIdForCode(input.code)
  if (!id) throw new AccountWorkflowError('მფლობელის ანგარიში ვერ მოიძებნა.')
  return repository.transactAccounts(async (tx) => {
    const target = await repository.lockedAccount(tx, id)
    if (!target?.person || !parseRoles(target.identity.roles).includes('owner'))
      throw new AuthorizationError()
    await repository.revokeAccess(tx, id)
    const purpose = target.identity.activatedAt ? 'reset' : 'activation'
    await repository.updateIdentity(
      tx,
      id,
      purpose === 'reset' ? 'active' : 'invited',
    )
    await repository.setEmployment(tx, id, 'active')
    const code = await issueChallenge(tx, id, null, purpose)
    await repository.auditAccess(tx, {
      actorId: null,
      targetId: id,
      action: 'account.operator_recovery',
      reason: input.reason,
    })
    return code
  })
}
