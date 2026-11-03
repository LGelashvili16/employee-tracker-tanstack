import { createAuthClient } from 'better-auth/react'

// Same-origin requests do not expose private server environment configuration.
export const authClient = createAuthClient()
