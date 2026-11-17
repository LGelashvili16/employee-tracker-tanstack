import '@tanstack/react-start/server-only'
import { db } from '#/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { APIError } from 'better-auth/api'
import { accountUserFields, employeeUsername } from './account-options.server'
import { employeeAccessPlugin } from '#/features/access/server/access-auth-plugin.server'
import { getLoginAccess } from '#/features/access/server/access.service.server'
import {
  maxPasswordLength,
  minPasswordLength,
} from '#/features/access/access.rules'

export const auth = betterAuth({
  advanced: { disableOriginCheck: false, disableCSRFCheck: false },
  // Company identities are administrator-owned, including legacy accounts with no username yet.
  disabledPaths: ['/sign-up/email', '/is-username-available', '/update-user'],
  database: drizzleAdapter(db, {
    provider: 'pg',
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    // Only the private administrative provisioning instance can create identities.
    disableSignUp: true,
    minPasswordLength,
    maxPasswordLength,
    revokeSessionsOnPasswordReset: true,
  },
  // Authorization reads current database grants rather than a cached role snapshot.
  session: { cookieCache: { enabled: false } },
  user: {
    additionalFields: accountUserFields,
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          if (!(await getLoginAccess(session.userId)).allowed)
            throw new APIError('FORBIDDEN', {
              code: 'ACCOUNT_UNAVAILABLE',
              message:
                'ანგარიშზე წვდომა მიუწვდომელია. დაუკავშირდით ადმინისტრატორს.',
            })
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/username': { window: 60, max: 10 },
      '/sign-in/email': { window: 60, max: 10 },
      '/employee-activate': { window: 60, max: 5 },
      '/employee-reset': { window: 60, max: 5 },
      '/change-password': { window: 60, max: 5 },
    },
  },
  plugins: [employeeUsername(), employeeAccessPlugin(), tanstackStartCookies()],
})
