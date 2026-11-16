import { sql } from 'drizzle-orm'
import {
  boolean,
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { createdAt, uuidv7PrimaryKey } from '#/db/schema/_shared/columns'
import { user } from '../auth/auth.schema'
import { attendanceSession } from './attendance.schema'
import { employee } from '../employees/employee.schema'

export const attendanceSecurityPolicy = pgTable(
  'attendance_security_policy',
  {
    /** Singleton company security policy. */
    id: integer('id').primaryKey().default(1),
    /** Whether attendance requires a listed public IP address. */
    ipRestrictionEnabled: boolean('ip_restriction_enabled')
      .notNull()
      .default(false),
    /** Independent switch for extra verification on clock actions. */
    passkeyRequired: boolean('passkey_required').notNull().default(false),
    /** Normalized exact addresses allowed for attendance. */
    allowedIps: jsonb('allowed_ips').$type<string[]>().notNull().default([]),
    /** Exact addresses denied application access, overriding all allowlists. */
    blockedIps: jsonb('blocked_ips').$type<string[]>().notNull().default([]),
    /** Optimistic version of the company policy. */
    revision: integer('revision').notNull().default(0),
  },
  (t) => [
    check(
      'attendance_security_singleton',
      sql`${t.id} = 1 and ${t.revision} >= 0`,
    ),
  ],
)

export const attendanceDevice = pgTable(
  'attendance_device',
  {
    /** Database-generated public identity; never a bearer credential. */
    id: uuidv7PrimaryKey(),
    /** Employee or reviewer account owning this browser approval. */
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** SHA-256 of the random HttpOnly browser token; raw tokens are never stored. */
    tokenHash: text('token_hash').notNull(),
    /** Employee-supplied label for recognizing the browser. */
    name: text('name').notNull(),
    /** Pending until another authorized reviewer approves this registration. */
    state: text('state').notNull().default('pending'),
    /** Public WebAuthn credential identifier, not a secret. */
    credentialId: text('credential_id'),
    /** Base64url COSE public key used to verify signatures. */
    publicKey: text('public_key'),
    /** Authenticator counter; bigint accepts the full unsigned WebAuthn range. */
    counter: bigint('counter', { mode: 'number' }).notNull().default(0),
    /** Authenticator hints for the browser, never proof of authorization. */
    transports: jsonb('transports').$type<string[]>().notNull().default([]),
    /** Reported credential backup state; it does not identify a physical device. */
    backedUp: boolean('backed_up').notNull().default(false),
    /** Reported single-device or multi-device credential metadata. */
    deviceType: text('device_type'),
    /** Trusted address observed when this registration was requested. */
    requestedIp: text('requested_ip'),
    /** Account that most recently reviewed this registration. */
    reviewedBy: text('reviewed_by').references(() => user.id, {
      onDelete: 'restrict',
    }),
    /** Server time of that review. */
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    /** Version used to reject a stale administrator decision. */
    revision: integer('revision').notNull().default(0),
    /** Database recording time, retained for history and expiry. */
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('attendance_device_browser_user').on(t.userId, t.tokenHash),
    uniqueIndex('attendance_device_credential').on(t.credentialId),
    index('attendance_device_queue').on(t.state, t.createdAt, t.id),
    check(
      'attendance_device_state',
      sql`${t.state} in ('pending','approved','rejected','revoked') and ${t.revision} >= 0 and ${t.counter} >= 0`,
    ),
  ],
)

export const attendanceEmployeeNetwork = pgTable(
  'attendance_employee_network',
  {
    /** Account receiving an individual attendance network rule. */
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Replacement for company allowed addresses; an empty array denies attendance. */
    allowedIps: jsonb('allowed_ips').$type<string[]>().notNull(),
  },
)

export const attendanceChallenge = pgTable(
  'attendance_challenge',
  {
    /** Database-generated public identity; never a bearer credential. */
    id: uuidv7PrimaryKey(),
    /** Authenticated account expected to complete this challenge. */
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Browser registration involved in this action. */
    deviceId: uuid('device_id')
      .notNull()
      .references(() => attendanceDevice.id, { onDelete: 'restrict' }),
    /** Hash of its Better Auth session ID, binding verification to that login. */
    sessionHash: text('session_hash').notNull(),
    /** Registration or attendance verification ceremony. */
    kind: text('kind').notNull(),
    /** Cryptographically random challenge supplied by SimpleWebAuthn. */
    challenge: text('challenge').notNull(),
    /** Digest of the validated attendance operation, subject, and reason. */
    actionHash: text('action_hash'),
    /** Server cutoff after which the challenge cannot be consumed. */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Database recording time, retained for history and expiry. */
    createdAt: createdAt(),
  },
  (t) => [
    index('attendance_challenge_actor').on(t.userId, t.createdAt),
    index('attendance_challenge_expiry').on(t.expiresAt),
  ],
)

/** Append-only facts for each punch; corrections never replace the original actor. */
export const attendancePunch = pgTable(
  'attendance_punch',
  {
    /** Database-generated public identity; never a bearer credential. */
    id: uuidv7PrimaryKey(),
    /** Working interval containing this individual clock action. */
    sessionId: uuid('session_id')
      .notNull()
      .references(() => attendanceSession.id, { onDelete: 'restrict' }),
    /** Employee whose working time is affected. */
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employee.id, { onDelete: 'restrict' }),
    /** Account associated with that employee at the time of the punch. */
    subjectUserId: text('subject_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Employee or HR account that actually triggered this punch. */
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Clock-in or clock-out; each working interval has at most one of each. */
    kind: text('kind').notNull(),
    /** Employee self-service or explicitly authorized HR assistance. */
    source: text('source').notNull(),
    /** Effective attendance instant supplied by the server. */
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    /** Trusted request address of the acting user. */
    ip: text('ip'),
    /** Browser registration involved in this action. */
    deviceId: uuid('device_id').references(() => attendanceDevice.id, {
      onDelete: 'restrict',
    }),
    /** Credential identifier retained as evidence even after later revocation. */
    credentialId: text('credential_id'),
    /** True only after successful WebAuthn user verification. */
    userVerified: boolean('user_verified').notNull(),
    /** Required for assisted attendance; absent for ordinary employee punches. */
    reason: text('reason'),
    /** Database recording time, retained for history and expiry. */
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('attendance_punch_once').on(t.sessionId, t.kind),
    check(
      'attendance_punch_kind',
      sql`${t.kind} in ('in','out') and ${t.source} in ('employee','hr')`,
    ),
    index('attendance_punch_employee').on(t.employeeId, t.createdAt),
  ],
)

export const attendanceSecurityAudit = pgTable(
  'attendance_security_audit',
  {
    /** Database-generated public identity; never a bearer credential. */
    id: uuidv7PrimaryKey(),
    /** Authenticated account responsible for this security event. */
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Affected policy, browser, or account identifier. */
    targetId: text('target_id').notNull(),
    /** Stable security operation name. */
    action: text('action').notNull(),
    /** Required decision explanation or a controlled system description. */
    reason: text('reason').notNull(),
    /** Minimal event facts; never cookies, session tokens, or assertions. */
    details: jsonb('details').$type<Record<string, unknown>>().notNull(),
    /** Database recording time, retained for history and expiry. */
    createdAt: createdAt(),
  },
  (t) => [
    index('attendance_security_audit_target').on(t.targetId, t.createdAt),
  ],
)
