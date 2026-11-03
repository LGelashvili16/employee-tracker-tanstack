import '@tanstack/react-start/server-only'
import { db } from '#/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    // Keep public signup closed until the invitation acceptance workflow is implemented.
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      roles: {
        type: 'string',
        required: false,
        defaultValue: 'employee',
        input: false,
      },
    },
  },
  plugins: [tanstackStartCookies()], // make sure this is the last plugin in the array
})
