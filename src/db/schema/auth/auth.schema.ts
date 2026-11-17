import { relations, sql } from 'drizzle-orm'
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  integer,
  bigint,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core'

/** One login identity per person; employment records remain a separate domain. */
export const user = pgTable('user', {
  /** Unique identifier for this record; referenced by related records. */
  id: text('id').primaryKey(),
  /** Display name shown for the account holder. */
  name: text('name').notNull(),
  /** Auth protocol identifier. Provisioned employees use a reserved .invalid address; real optional email belongs to their employee record. */
  email: text('email').notNull().unique(),
  /** Immutable normalized login name, equal to the company employee username; null for legacy email accounts. */
  username: text('username').unique(),
  /** Server-controlled account lifecycle: invited, active, or suspended. Existing accounts remain active. */
  accessState: text('access_state').notNull().default('active'),
  /** UTC activation instant; null until a provisioned employee chooses a password. Legacy values are backfilled by the migration. */
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  /** Whether Better Auth has verified ownership of this email address. */
  emailVerified: boolean('email_verified').default(false).notNull(),
  /** Comma-separated server-provisioned roles; default grants only employee access. Client input is disabled. */
  roles: text('roles').default('employee').notNull(),
  /** Explicit permission exceptions for this account. Empty allow/deny lists inherit its roles; denials take precedence. Changed only by access administrators. */
  permissionOverrides: jsonb('permission_overrides')
    .$type<{ allow: Array<string>; deny: Array<string> }>()
    .notNull()
    .default({ allow: [], deny: [] }),
  /** Optional account avatar URL; null when no avatar is provided. */
  image: text('image'),
  /** Time this record was created, managed by the authentication system. */
  createdAt: timestamp('created_at').defaultNow().notNull(),
  /** Time of the most recent change to this record. */
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

/** One authenticated session per signed-in browser/device, owned by its user. */
export const session = pgTable(
  'session',
  {
    /** Unique identifier for this record; referenced by related records. */
    id: text('id').primaryKey(),
    /** Time after which this session or verification record is no longer valid. */
    expiresAt: timestamp('expires_at').notNull(),
    /** Secret session bearer token; never expose it through application DTOs or logs. */
    token: text('token').notNull().unique(),
    /** Time this record was created, managed by the authentication system. */
    createdAt: timestamp('created_at').defaultNow().notNull(),
    /** Time of the most recent change to this record. */
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    /** Optional session source IP address; sensitive operational data. */
    ipAddress: text('ip_address'),
    /** Optional browser/device description associated with this session. */
    userAgent: text('user_agent'),
    /** Account that owns this auth record; references the auth user primary key. */
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

/** One provider credential/link per user and provider; deleted with the auth identity. */
export const account = pgTable(
  'account',
  {
    /** Unique identifier for this record; referenced by related records. */
    id: text('id').primaryKey(),
    /** Provider-specific account identifier used by Better Auth. */
    accountId: text('account_id').notNull(),
    /** Authentication provider identifier, including the credential provider. */
    providerId: text('provider_id').notNull(),
    /** Account that owns this auth record; references the auth user primary key. */
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Optional sensitive provider access token; server-only. */
    accessToken: text('access_token'),
    /** Optional sensitive provider refresh token; server-only. */
    refreshToken: text('refresh_token'),
    /** Optional sensitive identity-provider token; server-only. */
    idToken: text('id_token'),
    /** Expiry instant of the optional provider access token. */
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    /** Expiry instant of the optional provider refresh token. */
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    /** Optional provider-granted authorization scopes. */
    scope: text('scope'),
    /** Optional password hash managed by Better Auth; never a plaintext password. */
    password: text('password'),
    /** Time this record was created, managed by the authentication system. */
    createdAt: timestamp('created_at').defaultNow().notNull(),
    /** Time of the most recent change to this record. */
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('account_userId_idx').on(table.userId),
    uniqueIndex('account_one_credential_per_user')
      .on(table.userId)
      .where(sql`${table.providerId} = 'credential'`),
  ],
)

/** Better Auth's shared database-backed throttle counters; one row per request bucket, no employee credentials. */
export const rateLimit = pgTable('rate_limit', {
  /** Better Auth-generated bucket record identifier. */
  id: text('id').primaryKey(),
  /** Unique library-defined request bucket key, potentially containing a network address. */
  key: text('key').notNull().unique(),
  /** Request count in the current bounded window. */
  count: integer('count').notNull(),
  /** Last request time in Unix milliseconds, maintained by Better Auth. */
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
})

/** Expiring verification/recovery records, managed exclusively by Better Auth. */
export const verification = pgTable(
  'verification',
  {
    /** Unique identifier for this record; referenced by related records. */
    id: text('id').primaryKey(),
    /** Lookup identifier for the verification or recovery flow. */
    identifier: text('identifier').notNull(),
    /** Sensitive verification value managed by Better Auth; never return it to the UI. */
    value: text('value').notNull(),
    /** Time after which this session or verification record is no longer valid. */
    expiresAt: timestamp('expires_at').notNull(),
    /** Time this record was created, managed by the authentication system. */
    createdAt: timestamp('created_at').defaultNow().notNull(),
    /** Time of the most recent change to this record. */
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))
