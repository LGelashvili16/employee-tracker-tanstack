import '@tanstack/react-start/server-only'
import {
  getRequestHeaders,
  setResponseHeader,
} from '@tanstack/react-start/server'
import { auth } from './auth'
import {
  parseRoles,
  parsePermissionOverrides,
} from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'
import { getLoginAccess } from '#/features/access/server/access.service.server'
import { isSyntheticAuthEmail } from '#/features/access/access.rules'

export async function readActor(): Promise<Actor | null> {
  setResponseHeader('Cache-Control', 'private, no-store')
  return readActorFromHeaders(getRequestHeaders())
}

/** Long-lived HTTP streams revalidate captured request headers without mutating response headers. */
export async function readActorFromHeaders(
  headers: Headers,
  disableRefresh = false,
): Promise<Actor | null> {
  // Role changes and revocation must apply even if cookie caching is later enabled.
  const session = await auth.api.getSession({
    headers,
    query: {
      disableCookieCache: true,
      ...(disableRefresh ? { disableRefresh: true } : {}),
    },
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
    permissionOverrides: parsePermissionOverrides(access.permissionOverrides),
    roles: parseRoles(session.user.roles ?? 'employee'),
  }
}
