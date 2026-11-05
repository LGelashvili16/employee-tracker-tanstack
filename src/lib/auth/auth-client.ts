import { createAuthClient } from 'better-auth/react'
import { usernameClient } from 'better-auth/client/plugins'

// Same-origin requests do not expose private server environment configuration.
export const authClient = createAuthClient({
  plugins: [usernameClient({ displayUsername: false })],
})
