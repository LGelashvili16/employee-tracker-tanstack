import '@tanstack/react-start/server-only'
import { isIP } from 'node:net'
import { z } from 'zod'
import { db } from '#/db'
import { attendanceSecurityPolicy } from '#/db/schema'
import { getRequestIP } from '@tanstack/react-start/server'

/** Canonicalize IPv6, including mapped IPv4, before exact address comparison. */
export function normalizeIp(value: string): string | null {
  if (value.includes('%')) return null
  if (!isIP(value)) return null
  if (isIP(value) === 4) return value
  const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1)
  const mapped = /^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/i.exec(canonical)
  if (mapped) {
    const n = parseInt(mapped[1], 16) * 65536 + parseInt(mapped[2], 16)
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
  }
  return canonical
}

const proxyHeaderSchema = z.enum(['x-real-ip', 'cf-connecting-ip']).optional()
export function requestIp(request: Request, peer?: string): string | null {
  const header = proxyHeaderSchema.parse(
    process.env.TEAMWORK_CLIENT_IP_HEADER || undefined,
  )
  // Opt-in is deployment-owned: the proxy must overwrite this header and prevent direct origin access.
  const candidate = header ? request.headers.get(header) : peer
  return candidate ? normalizeIp(candidate) : null
}
export function currentRequestIp(request: Request) {
  return requestIp(request, getRequestIP({ xForwardedFor: false }))
}
export async function networkAllowed(ip: string | null) {
  const policy = (
    await db
      .select({ blockedIps: attendanceSecurityPolicy.blockedIps })
      .from(attendanceSecurityPolicy)
      .limit(1)
  ).at(0)
  if (!policy?.blockedIps.length) return true
  return (
    ip !== null && !policy.blockedIps.some((value) => normalizeIp(value) === ip)
  )
}
