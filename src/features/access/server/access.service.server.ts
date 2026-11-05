import '@tanstack/react-start/server-only'
import { createHash, randomInt } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { user } from '#/db/schema'
import { assertPermissions } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { parseRoles } from '#/lib/authorization/permissions'
import { provisionIdentity } from '#/lib/auth/provisioning.server'
import {
  assignInitialEmployeeWeek,
  ScheduleWorkflowError,
} from '#/features/scheduling/server/scheduling.service.server'
import {
  accountActionSchema,
  accountListSchema,
  completeAccountSchema,
  employeeDetailsSchema,
  ownPhoneSchema,
  provisionAccountSchema,
  ownerRecoverySchema,
} from '../access.schemas'
import {
  isSyntheticAuthEmail,
  setupCodeAlphabet,
  setupCodeLength,
  setupCodeLifetimeMinutes,
} from '../access.rules'
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

// randomInt is unbiased, unlike mapping raw random bytes onto a 32-symbol alphabet by modulo.
const generateSetupCode = () =>
  Array.from(
    { length: setupCodeLength },
    () => setupCodeAlphabet[randomInt(setupCodeAlphabet.length)],
  ).join('')

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
  const code = generateSetupCode()
  const expiresAt = new Date(
    Date.now() + setupCodeLifetimeMinutes[purpose] * 60_000,
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
  const userId = await provisionIdentity(
    tx,
    input.name,
    input.code,
    input.contactEmail,
  )
  const person = await repository.insertEmployee(tx, {
    code: input.code,
    userId,
    fullName: input.name,
    contactEmail: input.contactEmail || null,
    jobTitle: input.jobTitle || null,
    phone: input.phone || null,
  })
  if (input.workingWeek !== null) {
    if (!person || !actorId) throw new AuthorizationError()
    try {
      await assignInitialEmployeeWeek(person.id, input.workingWeek, actorId, tx)
    } catch (error) {
      if (error instanceof ScheduleWorkflowError)
        throw new AccountWorkflowError(error.message)
      throw error
    }
  }
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
    reason:
      role === 'owner'
        ? 'კომპანიის პირველი მფლობელის პირველადი შექმნა.'
        : 'თანამშრომლის ანგარიშის შექმნა.',
  })
  return challenge
}

export async function provisionEmployee(
  actor: Actor,
  untrusted: z.input<typeof provisionAccountSchema>,
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

export async function editEmployeeDetails(
  actor: Actor,
  untrusted: z.input<typeof employeeDetailsSchema>,
) {
  const input = employeeDetailsSchema.parse(untrusted)
  return repository.transactAccounts(async (tx) => {
    const administrator = await currentAdministrator(tx, actor)
    const target = await repository.lockedAccount(tx, input.userId)
    if (!target?.person)
      throw new AccountWorkflowError('თანამშრომლის ანგარიში ვერ მოიძებნა.')
    checkTarget(administrator, input.userId, parseRoles(target.identity.roles))
    // An email-based account signs in with this address, so it follows the contact email;
    // contact-only addresses of email-less accounts never become login identities.
    const usesLoginEmail = !isSyntheticAuthEmail(target.identity.email)
    if (usesLoginEmail && !input.contactEmail)
      throw new AccountWorkflowError(
        'ამ ანგარიშში ელფოსტა შესვლის მონაცემია და მისი წაშლა შეუძლებელია.',
      )
    if (
      input.contactEmail &&
      (await repository.emailInUse(tx, input.contactEmail, input.userId))
    )
      throw new AccountWorkflowError('ეს ელფოსტა სხვა ანგარიშს უკვე უკავია.')
    await repository.updateEmployeeDetails(tx, input.userId, {
      name: input.name,
      contactEmail: input.contactEmail,
      jobTitle: input.jobTitle,
      phone: input.phone,
      loginEmail: usesLoginEmail ? input.contactEmail : null,
    })
    await repository.auditAccess(tx, {
      actorId: administrator.id,
      targetId: input.userId,
      action: 'account.details_updated',
      reason: input.reason,
    })
  })
}

export async function readOwnProfile(actor: Actor) {
  return repository.readOwnProfile(actor.id)
}

/** The subject is always the authenticated actor; no employee identifier is accepted from the client. */
export async function updateOwnPhone(
  actor: Actor,
  untrusted: z.input<typeof ownPhoneSchema>,
) {
  const { phone } = ownPhoneSchema.parse(untrusted)
  if (!(await repository.updateOwnPhone(actor.id, phone || null)))
    throw new AccountWorkflowError('თანამშრომლის პროფილი ვერ მოიძებნა.')
  return { phone }
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
