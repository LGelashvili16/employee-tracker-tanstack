import '@tanstack/react-start/server-only'
import {
  getRequestHeaders,
  setResponseHeader,
} from '@tanstack/react-start/server'
import { auth } from './auth'
import { parseRoles } from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'
import { getLoginAccess } from '#/features/access/server/access.service.server'
import { isSyntheticAuthEmail } from '#/features/access/access.rules'

export async function readActor(): Promise<Actor | null> {
  setResponseHeader('Cache-Control', 'private, no-store')
  // Role changes and revocation must apply even if cookie caching is later enabled.
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
    query: { disableCookieCache: true },
  })
  if (!session) return null
  const access = await getLoginAccess(session.user.id)
  if (!access.allowed) return null
  return {
    id: session.user.id,
    name: session.user.name,
    email: isSyntheticAuthEmail(session.user.email)
      ? access.contactEmail
      : session.user.email,
    emailVerified: session.user.emailVerified,
    roles: parseRoles(session.user.roles ?? 'employee'),
  }
}
