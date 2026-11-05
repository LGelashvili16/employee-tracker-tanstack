import '@tanstack/react-start/server-only'
import { randomBytes } from 'node:crypto'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from '#/db/schema'
import { accountUserFields, employeeUsername } from './account-options.server'
import type { AccessTransaction } from '#/features/access/server/access.repository.server'

/** Private SDK instance, never mounted as an HTTP handler. The caller owns authorization and the outer database transaction. */
export async function provisionIdentity(
  tx: AccessTransaction,
  name: string,
  code: string,
) {
  const provisioning = betterAuth({
    database: drizzleAdapter(tx, {
      provider: 'pg',
      schema,
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    user: { additionalFields: accountUserFields },
    plugins: [employeeUsername()],
  })
  // Reserved .invalid addresses satisfy Better Auth's required email contract without inventing a deliverable employee email.
  // The random initial password is discarded. Invited accounts cannot authenticate before activation.
  const result = await provisioning.api.signUpEmail({
    body: {
      name,
      email: `employee-${randomBytes(16).toString('hex')}@accounts.teamwork.invalid`,
      username: code,
      password: randomBytes(48).toString('base64url'),
    },
  })
  return result.user.id
}
