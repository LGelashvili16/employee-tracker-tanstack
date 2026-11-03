import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core'

/** One login identity per person; employment records remain a separate domain. */
export const user = pgTable('user', {
  /** Unique identifier for this record; referenced by related records. */
  id: text('id').primaryKey(),
  /** Display name shown for the account holder. */
  name: text('name').notNull(),
  /** Unique email address used to sign in and receive account messages. */
  email: text('email').notNull().unique(),
  /** Whether Better Auth has verified ownership of this email address. */
  emailVerified: boolean('email_verified').default(false).notNull(),
  /** Comma-separated server-provisioned roles; default grants only employee access. Client input is disabled. */
  roles: text('roles').default('employee').notNull(),
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
  (table) => [index('account_userId_idx').on(table.userId)],
)

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
