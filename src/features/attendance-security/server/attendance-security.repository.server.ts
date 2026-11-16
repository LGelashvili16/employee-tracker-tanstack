import '@tanstack/react-start/server-only'
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import {
  attendanceDevice,
  attendanceSecurityAudit,
  attendanceSecurityPolicy,
  employee,
  user,
} from '#/db/schema'
import { currentAuthorization } from '#/lib/authorization/permissions'
import { assertPermission } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import type { Actor } from '#/lib/authorization/actor'
import type { Permission } from '#/lib/authorization/permissions'
import type { AttendanceTransaction } from '#/features/attendance/server/attendance.repository.server'
import type { securityListSchema } from '../attendance-security.schemas'
import type { z } from 'zod'

export async function currentActor(
  tx: AttendanceTransaction,
  actor: Actor | null,
  permission?: Permission,
) {
  if (!actor) throw new AuthorizationError()
  const row = (
    await tx
      .select({
        roles: user.roles,
        permissionOverrides: user.permissionOverrides,
        state: user.accessState,
      })
      .from(user)
      .where(eq(user.id, actor.id))
      .for('share')
  ).at(0)
  const person = (
    await tx
      .select({ status: employee.status })
      .from(employee)
      .where(eq(employee.userId, actor.id))
      .for('share')
  ).at(0)
  if (!row || row.state !== 'active' || (person && person.status !== 'active'))
    throw new AuthorizationError()
  const current = { ...actor, ...currentAuthorization(row) }
  if (permission) assertPermission(current, permission)
  return current
}
export async function policyForUpdate(tx: AttendanceTransaction) {
  await tx
    .insert(attendanceSecurityPolicy)
    .values({ id: 1 })
    .onConflictDoNothing()
  return (
    await tx
      .select()
      .from(attendanceSecurityPolicy)
      .where(eq(attendanceSecurityPolicy.id, 1))
      .for('update')
  )[0]
}
export async function auditSecurity(
  tx: AttendanceTransaction,
  actorId: string,
  targetId: string,
  action: string,
  reason: string,
  details: Record<string, unknown>,
) {
  await tx
    .insert(attendanceSecurityAudit)
    .values({ actorId, targetId, action, reason, details })
}
export async function listDevices(
  tx: AttendanceTransaction,
  input: z.infer<typeof securityListSchema>,
  ownUserId?: string,
) {
  const pattern = `%${input.q.replace(/[\\%_]/g, '\\$&')}%`
  const where = and(
    ownUserId || input.userId
      ? eq(attendanceDevice.userId, ownUserId ?? input.userId!)
      : undefined,
    input.state === 'all' ? undefined : eq(attendanceDevice.state, input.state),
    input.q
      ? or(ilike(user.name, pattern), ilike(attendanceDevice.name, pattern))
      : undefined,
  )
  const items = await tx
    .select({
      id: attendanceDevice.id,
      userId: attendanceDevice.userId,
      userName: user.name,
      name: attendanceDevice.name,
      state: attendanceDevice.state,
      hasPasskey: sql<boolean>`${attendanceDevice.credentialId} is not null`,
      backedUp: attendanceDevice.backedUp,
      requestedIp: attendanceDevice.requestedIp,
      revision: attendanceDevice.revision,
      createdAt: attendanceDevice.createdAt,
      reviewedAt: attendanceDevice.reviewedAt,
    })
    .from(attendanceDevice)
    .innerJoin(user, eq(user.id, attendanceDevice.userId))
    .where(where)
    .orderBy(
      input.sort === 'oldest'
        ? asc(attendanceDevice.createdAt)
        : desc(attendanceDevice.createdAt),
      desc(attendanceDevice.id),
    )
    .limit(20)
    .offset((input.page - 1) * 20)
  const [total] = await tx
    .select({ value: count() })
    .from(attendanceDevice)
    .innerJoin(user, eq(user.id, attendanceDevice.userId))
    .where(where)
  return {
    items: items.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
    })),
    total: total.value,
    page: input.page,
    pageSize: 20,
  }
}
