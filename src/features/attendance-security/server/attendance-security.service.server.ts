import '@tanstack/react-start/server-only'
import { and, count, eq, gt, lt, sql } from 'drizzle-orm'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { db } from '#/db'
import {
  attendanceChallenge,
  attendanceDevice,
  attendanceEmployeeNetwork,
  attendancePunch,
  attendanceSecurityAudit,
  attendanceSecurityPolicy,
  user,
} from '#/db/schema'
import { getCompanyWorkday } from '#/features/scheduling/server/scheduling.service.server'
import { APP_NAME } from '#/lib/app'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  currentAuthorization,
  hasPermission,
} from '#/lib/authorization/permissions'
import { deliverNotifications } from '#/features/notifications/server/notifications.service.server'
import {
  clockIntentSchema,
  clockProofSchema,
  deviceDecisionSchema,
  employeeNetworkSchema,
  registerDeviceSchema,
  registrationProofSchema,
  securityListSchema,
  securityPolicySchema,
} from '../attendance-security.schemas'
import {
  auditSecurity,
  currentActor,
  listDevices,
  policyForUpdate,
} from './attendance-security.repository.server'
import {
  AttendanceSecurityError,
  digest,
  relyingParty,
} from './attendance-security-context.server'
import { normalizeIp } from './network.server'
import type { ClockSecurityContext } from './attendance-security-context.server'
import type { Actor } from '#/lib/authorization/actor'
import type { AttendanceTransaction } from '#/features/attendance/server/attendance.repository.server'

export const defaultSecurityPolicy = {
  id: 1,
  ipRestrictionEnabled: false,
  passkeyRequired: false,
  allowedIps: [] as string[],
  blockedIps: [] as string[],
  revision: 0,
}
export async function readPolicy(tx: AttendanceTransaction) {
  return (
    (
      await tx
        .select()
        .from(attendanceSecurityPolicy)
        .where(eq(attendanceSecurityPolicy.id, 1))
        .for('share')
    ).at(0) ?? defaultSecurityPolicy
  )
}
function fail(message: string): never {
  throw new AttendanceSecurityError(message)
}
function requireContext(
  actor: Actor,
  context?: ClockSecurityContext,
): asserts context is ClockSecurityContext {
  if (!context || context.userId !== actor.id || !context.sessionHash)
    throw new AuthorizationError()
}
export async function enforceClockNetwork(
  tx: AttendanceTransaction,
  policy: typeof defaultSecurityPolicy,
  actorId: string,
  ip: string | null,
) {
  if (
    policy.blockedIps.length &&
    (!ip || policy.blockedIps.some((value) => normalizeIp(value) === ip))
  )
    fail('ამ ქსელიდან წვდომა აკრძალულია.')
  if (!policy.ipRestrictionEnabled) return
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`attendance-network:${actorId}`}, 0))`,
  )
  const individual = (
    await tx
      .select()
      .from(attendanceEmployeeNetwork)
      .where(eq(attendanceEmployeeNetwork.userId, actorId))
  ).at(0)
  const allowed = individual?.allowedIps ?? policy.allowedIps
  if (!ip || !allowed.some((value) => normalizeIp(value) === ip))
    fail('ამ ქსელიდან დასწრების აღრიცხვა აკრძალულია. დაუკავშირდით HR-ს.')
}
async function browser(
  tx: AttendanceTransaction,
  actor: Actor,
  context: ClockSecurityContext,
  lock = false,
) {
  if (!context.tokenHash) return null
  const query = tx
    .select()
    .from(attendanceDevice)
    .where(
      and(
        eq(attendanceDevice.userId, actor.id),
        eq(attendanceDevice.tokenHash, context.tokenHash),
      ),
    )
  return (await (lock ? query.for('update') : query)).at(0) ?? null
}
async function notifyReviewers(
  tx: AttendanceTransaction,
  actorId: string,
  deviceId: string,
  revision: number,
) {
  const accounts = await tx
    .select({
      id: user.id,
      roles: user.roles,
      permissionOverrides: user.permissionOverrides,
    })
    .from(user)
    .where(eq(user.accessState, 'active'))
  const recipients = accounts
    .filter(
      (row) =>
        row.id !== actorId &&
        hasPermission(currentAuthorization(row), 'attendance.devices.manage'),
    )
    .map((row) => row.id)
  if (recipients.length)
    await deliverNotifications(tx, {
      eventKey: `device:${deviceId}:${revision}`,
      recipientIds: recipients,
      actorId,
      title: 'მოწყობილობის დადასტურება',
      body: 'თანამშრომლის დასწრების მოწყობილობა დასადასტურებელია.',
    })
}
async function enforceDeviceCapacity(
  tx: AttendanceTransaction,
  userId: string,
) {
  const [total] = await tx
    .select({ value: count() })
    .from(attendanceDevice)
    .where(
      and(
        eq(attendanceDevice.userId, userId),
        sql`${attendanceDevice.state} in ('pending','approved')`,
      ),
    )
  if (total.value >= 20)
    fail('მოწყობილობების ზღვარი მიღწეულია. დაუკავშირდით HR-ს.')
}
/** POST-only provisioning; browser reads and route preloads never create registrations. */
export async function requestDevice(
  actor: Actor,
  input: unknown,
  context: ClockSecurityContext,
  reapply = false,
) {
  requireContext(actor, context)
  const { name } = registerDeviceSchema.parse(input)
  if (!context.tokenHash) throw new AuthorizationError()
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`attendance-device:${actor.id}`}, 0))`,
    )
    await currentActor(tx, actor)
    const policy = await readPolicy(tx)
    await enforceClockNetwork(tx, policy, actor.id, context.ip)
    const existing = await browser(tx, actor, context, true)
    if (existing) {
      if (reapply && ['rejected', 'revoked'].includes(existing.state)) {
        await enforceDeviceCapacity(tx, actor.id)
        if (
          existing.reviewedAt &&
          Date.now() - existing.reviewedAt.getTime() < 60_000
        )
          fail('ხელახლა მოთხოვნა ერთ წუთში იქნება შესაძლებელი.')
        await tx
          .update(attendanceDevice)
          .set({
            state: 'pending',
            name,
            reviewedBy: null,
            reviewedAt: null,
            revision: existing.revision + 1,
          })
          .where(eq(attendanceDevice.id, existing.id))
        await auditSecurity(
          tx,
          actor.id,
          existing.id,
          'device.requested',
          'მოწყობილობის ხელახალი დადასტურების მოთხოვნა.',
          { before: existing.state },
        )
        await notifyReviewers(tx, actor.id, existing.id, existing.revision + 1)
        return { id: existing.id, state: 'pending' }
      }
      return { id: existing.id, state: existing.state }
    }
    await enforceDeviceCapacity(tx, actor.id)
    const [created] = await tx
      .insert(attendanceDevice)
      .values({
        userId: actor.id,
        tokenHash: context.tokenHash!,
        name,
        requestedIp: context.ip,
      })
      .returning()
    await auditSecurity(
      tx,
      actor.id,
      created.id,
      'device.requested',
      'მოწყობილობის რეგისტრაციის მოთხოვნა.',
      { ip: context.ip, name },
    )
    await notifyReviewers(tx, actor.id, created.id, 0)
    return { id: created.id, state: created.state }
  })
}
async function challengeBudget(tx: AttendanceTransaction, actorId: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`attendance-challenge:${actorId}`}, 0))`,
  )
  await tx
    .delete(attendanceChallenge)
    .where(lt(attendanceChallenge.expiresAt, new Date()))
  const [recent] = await tx
    .select({ value: count() })
    .from(attendanceChallenge)
    .where(
      and(
        eq(attendanceChallenge.userId, actorId),
        gt(attendanceChallenge.createdAt, new Date(Date.now() - 60_000)),
      ),
    )
  if (recent.value >= 10)
    fail('მოთხოვნების ზღვარი მიღწეულია. სცადეთ ერთ წუთში.')
}
export async function beginRegistration(
  actor: Actor,
  context: ClockSecurityContext,
) {
  requireContext(actor, context)
  return db.transaction(async (tx) => {
    await currentActor(tx, actor)
    const device = await browser(tx, actor, context, true)
    if (!device || ['rejected', 'revoked'].includes(device.state))
      fail('ჯერ მოითხოვეთ მოწყობილობის რეგისტრაცია ან დაუკავშირდით HR-ს.')
    if (device.credentialId)
      fail('ამ ბრაუზერს დადასტურების გასაღები უკვე აქვს.')
    const policy = await readPolicy(tx)
    await enforceClockNetwork(tx, policy, actor.id, context.ip)
    await challengeBudget(tx, actor.id)
    const rp = relyingParty()
    const options = await generateRegistrationOptions({
      rpName: APP_NAME,
      rpID: rp.rpID,
      userName: actor.name,
      userID: new TextEncoder().encode(digest(actor.id)),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
      },
    })
    const [challenge] = await tx
      .insert(attendanceChallenge)
      .values({
        userId: actor.id,
        deviceId: device.id,
        sessionHash: context.sessionHash,
        kind: 'registration',
        challenge: options.challenge,
        expiresAt: new Date(Date.now() + 120_000),
      })
      .returning({ id: attendanceChallenge.id })
    const { extensions: _extensions, ...serializableOptions } = options
    return { challengeId: challenge.id, options: serializableOptions }
  })
}
async function consumeChallenge(
  tx: AttendanceTransaction,
  actor: Actor,
  context: ClockSecurityContext,
  id: string,
  kind: string,
  deviceId: string,
) {
  const challenge = (
    await tx
      .delete(attendanceChallenge)
      .where(
        and(
          eq(attendanceChallenge.id, id),
          eq(attendanceChallenge.userId, actor.id),
          eq(attendanceChallenge.sessionHash, context.sessionHash),
          eq(attendanceChallenge.deviceId, deviceId),
          eq(attendanceChallenge.kind, kind),
          gt(attendanceChallenge.expiresAt, new Date()),
        ),
      )
      .returning()
  ).at(0)
  if (!challenge)
    fail(
      'დადასტურების მოთხოვნა ვადაგასულია ან უკვე გამოყენებულია. სცადეთ ხელახლა.',
    )
  return challenge
}
function boundedResponse(value: unknown) {
  if (JSON.stringify(value).length > 32000)
    fail('დადასტურების პასუხი არასწორია.')
  return value
}
export async function finishRegistration(
  actor: Actor,
  input: unknown,
  context: ClockSecurityContext,
) {
  requireContext(actor, context)
  const data = registrationProofSchema.parse(input)
  return db.transaction(async (tx) => {
    await currentActor(tx, actor)
    await enforceClockNetwork(tx, await readPolicy(tx), actor.id, context.ip)
    const device = await browser(tx, actor, context, true)
    if (
      !device ||
      device.credentialId ||
      ['rejected', 'revoked'].includes(device.state)
    )
      throw new AuthorizationError()
    const challenge = await consumeChallenge(
      tx,
      actor,
      context,
      data.challengeId,
      'registration',
      device.id,
    )
    const rp = relyingParty()
    let result
    try {
      result = await verifyRegistrationResponse({
        response: boundedResponse(data.response) as RegistrationResponseJSON,
        expectedChallenge: challenge.challenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        requireUserVerification: true,
      })
    } catch {
      fail('გასაღების რეგისტრაცია ვერ დადასტურდა. სცადეთ ხელახლა.')
    }
    if (!result.verified) fail('გასაღების რეგისტრაცია ვერ დადასტურდა.')
    const info = result.registrationInfo
    await tx
      .update(attendanceDevice)
      .set({
        credentialId: info.credential.id,
        publicKey: Buffer.from(info.credential.publicKey).toString('base64url'),
        counter: info.credential.counter,
        transports: info.credential.transports ?? [],
        backedUp: info.credentialBackedUp,
        deviceType: info.credentialDeviceType,
        state: 'pending',
        reviewedAt: null,
        reviewedBy: null,
        revision: device.revision + 1,
      })
      .where(eq(attendanceDevice.id, device.id))
    await auditSecurity(
      tx,
      actor.id,
      device.id,
      'credential.registered',
      'დადასტურების გასაღების რეგისტრაცია.',
      {
        backedUp: info.credentialBackedUp,
        deviceType: info.credentialDeviceType,
      },
    )
    await notifyReviewers(tx, actor.id, device.id, device.revision + 1)
    return { id: device.id }
  })
}
export async function prepareClock(
  actor: Actor,
  input: unknown,
  context: ClockSecurityContext,
) {
  requireContext(actor, context)
  const intent = clockIntentSchema.parse(input)
  return db.transaction(async (tx) => {
    await currentActor(
      tx,
      actor,
      intent.targetUserId ? 'attendance.clock.assist' : undefined,
    )
    if (
      intent.targetUserId &&
      (intent.targetUserId === actor.id || !intent.reason)
    )
      throw new AuthorizationError()
    const device = await browser(tx, actor, context, true)
    if (
      device?.state !== 'approved' ||
      Date.now() - device.createdAt.getTime() >= 365 * 86400_000
    )
      fail(
        'მოწყობილობა დასადასტურებელია. გახსენით ანგარიშის უსაფრთხოება და დაუკავშირდით HR-ს.',
      )
    const policy = await readPolicy(tx)
    await enforceClockNetwork(tx, policy, actor.id, context.ip)
    if (!policy.passkeyRequired) return { challengeId: null, options: null }
    if (!device.credentialId)
      fail('დაამატეთ დადასტურების გასაღები ანგარიშის უსაფრთხოების გვერდზე.')
    await challengeBudget(tx, actor.id)
    const options = await generateAuthenticationOptions({
      rpID: relyingParty().rpID,
      userVerification: 'required',
      allowCredentials: [
        {
          id: device.credentialId,
          transports: device.transports,
        },
      ],
    })
    const [challenge] = await tx
      .insert(attendanceChallenge)
      .values({
        userId: actor.id,
        sessionHash: context.sessionHash,
        deviceId: device.id,
        kind: 'clock',
        challenge: options.challenge,
        actionHash: digest(JSON.stringify(intent)),
        expiresAt: new Date(Date.now() + 120_000),
      })
      .returning({ id: attendanceChallenge.id })
    const { extensions: _extensions, ...serializableOptions } = options
    return { challengeId: challenge.id, options: serializableOptions }
  })
}
/** Runs in the punch transaction so a successful assertion cannot authorize two writes. */
export async function authorizeClockAction(
  tx: AttendanceTransaction,
  actor: Actor,
  input: unknown,
  context?: ClockSecurityContext,
) {
  requireContext(actor, context)
  const proof = clockProofSchema.parse(input)
  await currentActor(
    tx,
    actor,
    proof.intent.targetUserId ? 'attendance.clock.assist' : undefined,
  )
  if (
    proof.intent.targetUserId &&
    (proof.intent.targetUserId === actor.id || !proof.intent.reason)
  )
    throw new AuthorizationError()
  const device = await browser(tx, actor, context, true)
  if (
    device?.state !== 'approved' ||
    Date.now() - device.createdAt.getTime() >= 365 * 86400_000
  )
    fail(
      'მოწყობილობა არ არის დადასტურებული ან ვადა ამოიწურა. დაუკავშირდით HR-ს.',
    )
  const policy = await readPolicy(tx)
  await enforceClockNetwork(tx, policy, actor.id, context.ip)
  let userVerified = false
  if (policy.passkeyRequired) {
    if (
      !proof.challengeId ||
      !proof.response ||
      !device.credentialId ||
      !device.publicKey
    )
      fail('საჭიროა მოქმედების დამატებითი დადასტურება.')
    const challenge = await consumeChallenge(
      tx,
      actor,
      context,
      proof.challengeId,
      'clock',
      device.id,
    )
    if (challenge.actionHash !== digest(JSON.stringify(proof.intent)))
      fail('დადასტურება სხვა მოქმედებას ეკუთვნის.')
    const rp = relyingParty()
    let result
    try {
      result = await verifyAuthenticationResponse({
        response: boundedResponse(proof.response) as AuthenticationResponseJSON,
        expectedChallenge: challenge.challenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        requireUserVerification: true,
        credential: {
          id: device.credentialId,
          publicKey: new Uint8Array(Buffer.from(device.publicKey, 'base64url')),
          counter: device.counter,
          transports: device.transports,
        },
      })
    } catch {
      fail('მოქმედების დადასტურება ვერ შესრულდა. სცადეთ ხელახლა.')
    }
    if (!result.verified || !result.authenticationInfo.userVerified)
      fail('საჭიროა მომხმარებლის დადასტურება.')
    userVerified = true
    await tx
      .update(attendanceDevice)
      .set({
        counter: result.authenticationInfo.newCounter,
        backedUp: result.authenticationInfo.credentialBackedUp,
      })
      .where(eq(attendanceDevice.id, device.id))
  }
  return {
    deviceId: device.id,
    credentialId: userVerified ? device.credentialId : null,
    userVerified,
    ip: context.ip,
    intent: proof.intent,
  }
}
export async function recordPunch(
  tx: AttendanceTransaction,
  value: typeof attendancePunch.$inferInsert,
) {
  await tx.insert(attendancePunch).values(value)
  if (value.source === 'hr')
    await deliverNotifications(tx, {
      eventKey: `punch:${value.sessionId}:${value.kind}`,
      recipientIds: [value.subjectUserId],
      actorId: value.actorId,
      title:
        value.kind === 'in'
          ? 'სამუშაოს დაწყება HR-მ აღრიცხა'
          : 'სამუშაოს დასრულება HR-მ აღრიცხა',
      body: value.reason ?? 'დასწრების ჩანაწერი განახლდა.',
    })
}
/** Bound repeated denials so a broken browser cannot flood the security journal. */
export async function recordClockDenial(actorId: string, message: string) {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`attendance-denial:${actorId}`}, 0))`,
    )
    const [recent] = await tx
      .select({ value: count() })
      .from(attendanceSecurityAudit)
      .where(
        and(
          eq(attendanceSecurityAudit.actorId, actorId),
          eq(attendanceSecurityAudit.targetId, actorId),
          eq(attendanceSecurityAudit.action, 'clock.denied'),
          gt(attendanceSecurityAudit.createdAt, new Date(Date.now() - 60_000)),
        ),
      )
    if (recent.value < 20)
      await auditSecurity(tx, actorId, actorId, 'clock.denied', message, {})
  })
}
async function currentDeviceStatus(
  tx: AttendanceTransaction,
  actor: Actor,
  context: ClockSecurityContext,
) {
  const policy = await readPolicy(tx)
  const current = await browser(tx, actor, context)
  return {
    passkeyRequired: policy.passkeyRequired,
    currentDevice: current
      ? {
          id: current.id,
          name: current.name,
          state: current.state,
          hasPasskey: current.credentialId !== null,
        }
      : null,
  }
}
export async function deviceStatus(
  actor: Actor,
  context: ClockSecurityContext,
) {
  requireContext(actor, context)
  return db.transaction(async (tx) => {
    await currentActor(tx, actor)
    return currentDeviceStatus(tx, actor, context)
  })
}
export async function ownDevices(
  actor: Actor,
  input: unknown,
  context: ClockSecurityContext,
) {
  const data = securityListSchema.parse(input)
  return db.transaction(async (tx) => {
    await currentActor(tx, actor)
    const status = await currentDeviceStatus(tx, actor, context)
    return {
      ...(await listDevices(tx, data, actor.id)),
      ...status,
      currentDeviceId: status.currentDevice?.id ?? null,
      timezone: (await getCompanyWorkday(new Date(), tx)).timezone,
    }
  })
}
export async function reviewDevices(actor: Actor, input: unknown) {
  return db.transaction(
    async (tx) => {
      await currentActor(tx, actor, 'attendance.devices.manage')
      return {
        ...(await listDevices(tx, securityListSchema.parse(input))),
        timezone: (await getCompanyWorkday(new Date(), tx)).timezone,
      }
    },
    { isolationLevel: 'repeatable read' },
  )
}
export async function decideDevice(actor: Actor, input: unknown) {
  const data = deviceDecisionSchema.parse(input)
  return db.transaction(async (tx) => {
    await currentActor(tx, actor, 'attendance.devices.manage')
    const device = (
      await tx
        .select()
        .from(attendanceDevice)
        .where(eq(attendanceDevice.id, data.id))
        .for('update')
    ).at(0)
    if (!device || device.userId === actor.id) throw new AuthorizationError()
    if (device.revision !== data.revision)
      fail('ჩანაწერი შეიცვალა. განაახლეთ გვერდი.')
    if (data.decision === 'approved' && device.state !== 'pending')
      fail('მხოლოდ მიმდინარე მოთხოვნის დადასტურებაა შესაძლებელი.')
    if (data.decision === 'rejected' && device.state !== 'pending')
      fail('მოთხოვნა აღარ არის მიმდინარე.')
    if (data.decision === 'revoked' && device.state !== 'approved')
      fail('მოწყობილობა არ არის აქტიური.')
    const policy = await readPolicy(tx)
    if (
      data.decision === 'approved' &&
      policy.passkeyRequired &&
      !device.credentialId
    )
      fail('თანამშრომელმა ჯერ დადასტურების გასაღები უნდა დაამატოს.')
    await tx
      .update(attendanceDevice)
      .set({
        state: data.decision,
        reviewedBy: actor.id,
        reviewedAt: new Date(),
        revision: device.revision + 1,
      })
      .where(eq(attendanceDevice.id, device.id))
    await auditSecurity(
      tx,
      actor.id,
      device.id,
      `device.${data.decision}`,
      'მოწყობილობის სტატუსი შეცვლილია.',
      { userId: device.userId, before: device.state, after: data.decision },
    )
    await deliverNotifications(tx, {
      eventKey: `device-decision:${device.id}:${device.revision + 1}`,
      recipientIds: [device.userId],
      actorId: actor.id,
      title: 'მოწყობილობის სტატუსი შეიცვალა',
      body:
        data.decision === 'approved'
          ? 'დასწრების მოწყობილობა დადასტურებულია. შეგიძლიათ ხელახლა სცადოთ.'
          : 'მოწყობილობა შეზღუდულია. შეკითხვებისთვის დაუკავშირდით HR-ს.',
    })
    return { id: device.id }
  })
}
export async function securitySettings(actor: Actor) {
  return db.transaction(async (tx) => {
    await currentActor(tx, actor, 'security.configure')
    return readPolicy(tx)
  })
}
export async function saveSecuritySettings(
  actor: Actor,
  input: unknown,
  context: ClockSecurityContext,
) {
  const data = securityPolicySchema.parse(input)
  return db.transaction(async (tx) => {
    await currentActor(tx, actor, 'security.configure')
    const before = await policyForUpdate(tx)
    if (before.revision !== data.revision)
      fail('პარამეტრები შეიცვალა. განაახლეთ გვერდი.')
    const allowedIps = [
      ...new Set(data.allowedIps.map((value) => normalizeIp(value)!)),
    ]
    const blockedIps = [
      ...new Set(data.blockedIps.map((value) => normalizeIp(value)!)),
    ]
    if (blockedIps.length && (!context.ip || blockedIps.includes(context.ip)))
      fail(
        'მიმდინარე ქსელის დაბლოკვა დაუშვებელია. გადაამოწმეთ სერვერის IP კონფიგურაცია.',
      )
    if (data.ipRestrictionEnabled && !context.ip)
      fail('სერვერი ვერ ადგენს სანდო IP მისამართს. ჯერ გამართეთ პროქსი.')
    const after = {
      ipRestrictionEnabled: data.ipRestrictionEnabled,
      passkeyRequired: data.passkeyRequired,
      allowedIps,
      blockedIps,
      revision: before.revision + 1,
    }
    await tx
      .update(attendanceSecurityPolicy)
      .set(after)
      .where(eq(attendanceSecurityPolicy.id, 1))
    await auditSecurity(
      tx,
      actor.id,
      'policy',
      'policy.updated',
      'უსაფრთხოების წესები შეიცვალა.',
      {
        before,
        after,
      },
    )
    return after
  })
}
export async function readEmployeeNetwork(actor: Actor, userId: string) {
  return db.transaction(async (tx) => {
    await currentActor(tx, actor, 'security.configure')
    return {
      allowedIps:
        (
          await tx
            .select()
            .from(attendanceEmployeeNetwork)
            .where(eq(attendanceEmployeeNetwork.userId, userId))
        ).at(0)?.allowedIps ?? null,
    }
  })
}
export async function saveEmployeeNetwork(actor: Actor, input: unknown) {
  const data = employeeNetworkSchema.parse(input)
  return db.transaction(async (tx) => {
    await currentActor(tx, actor, 'security.configure')
    if (actor.id === data.userId) throw new AuthorizationError()
    if (
      !(
        await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, data.userId))
      ).length
    )
      throw new AuthorizationError()
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`attendance-network:${data.userId}`}, 0))`,
    )
    const before =
      (
        await tx
          .select()
          .from(attendanceEmployeeNetwork)
          .where(eq(attendanceEmployeeNetwork.userId, data.userId))
      ).at(0)?.allowedIps ?? null
    const allowedIps =
      data.allowedIps?.map((value) => normalizeIp(value)!) ?? null
    if (allowedIps === null)
      await tx
        .delete(attendanceEmployeeNetwork)
        .where(eq(attendanceEmployeeNetwork.userId, data.userId))
    else
      await tx
        .insert(attendanceEmployeeNetwork)
        .values({ userId: data.userId, allowedIps })
        .onConflictDoUpdate({
          target: attendanceEmployeeNetwork.userId,
          set: { allowedIps },
        })
    await auditSecurity(
      tx,
      actor.id,
      data.userId,
      'network.updated',
      data.reason,
      { before, after: allowedIps },
    )
    return { allowedIps }
  })
}
