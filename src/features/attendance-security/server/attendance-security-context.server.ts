import '@tanstack/react-start/server-only'
import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { getCookie, getRequest, setCookie } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth/auth'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { currentRequestIp } from './network.server'
import type { Actor } from '#/lib/authorization/actor'

export class AttendanceSecurityError extends Error {}
export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex')
export type ClockSecurityContext = {
  userId: string
  sessionHash: string
  tokenHash: string | null
  ip: string | null
}
export function relyingParty() {
  const url = new URL(z.url().parse(process.env.BETTER_AUTH_URL))
  if (
    url.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(url.hostname)
  )
    throw new AttendanceSecurityError('უსაფრთხო კავშირი არ არის გამართული.')
  return {
    origin: url.origin,
    rpID: url.hostname,
    secure: url.protocol === 'https:',
  }
}
function deviceCookieName() {
  return relyingParty().secure
    ? '__Host-teamwork-attendance-device'
    : 'teamwork-attendance-device'
}
export async function clockSecurityContext(
  actor: Actor,
  mutation = false,
): Promise<ClockSecurityContext> {
  const request = getRequest()
  if (mutation && request.headers.get('origin') !== relyingParty().origin)
    throw new AuthorizationError()
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  })
  if (!session || session.user.id !== actor.id) throw new AuthorizationError()
  const token = z
    .string()
    .regex(/^[A-Za-z0-9_-]{43}$/)
    .safeParse(getCookie(deviceCookieName()))
  return {
    userId: actor.id,
    sessionHash: digest(session.session.id),
    tokenHash: token.success ? digest(token.data) : null,
    ip: currentRequestIp(request),
  }
}
export function issueBrowserCookie(context: ClockSecurityContext) {
  if (context.tokenHash) return context
  const token = randomBytes(32).toString('base64url')
  setCookie(deviceCookieName(), token, {
    httpOnly: true,
    secure: relyingParty().secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return { ...context, tokenHash: digest(token) }
}
