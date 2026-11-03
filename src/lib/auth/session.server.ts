import '@tanstack/react-start/server-only'
import {
  getRequestHeaders,
  setResponseHeader,
} from '@tanstack/react-start/server'
import { auth } from './auth'
import { parseRoles } from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'

export async function readActor(): Promise<Actor | null> {
  setResponseHeader('Cache-Control', 'private, no-store')
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) return null
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    roles: parseRoles(session.user.roles ?? 'employee'),
  }
}
