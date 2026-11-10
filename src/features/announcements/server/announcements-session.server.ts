import '@tanstack/react-start/server-only'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth/auth'
import { AuthorizationError } from '#/lib/authorization/authorization-error'

/** The modal cutoff comes from Better Auth's current session, never a browser-supplied date. */
export async function currentLoginAt(actorId: string) {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
    query: { disableCookieCache: true },
  })
  if (!session || session.user.id !== actorId) throw new AuthorizationError()
  return session.session.createdAt
}
