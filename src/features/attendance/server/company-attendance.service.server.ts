import '@tanstack/react-start/server-only'
import { assertPermission } from '#/lib/authorization/access'
import { authorizeAttendance } from './attendance-review.policy.server'
import { transactAttendance } from './attendance.repository.server'
import {
  companyAttendanceListSchema,
  companyAttendanceUserSchema,
} from '../company-attendance.schemas'
import * as repository from './company-attendance.repository.server'
import type { Actor } from '#/lib/authorization/actor'

async function authorize(
  tx: Parameters<typeof authorizeAttendance>[0],
  actor: Actor | null,
) {
  const current = await authorizeAttendance(tx, actor, 'attendance.read.all')
  assertPermission(current, 'admin.access')
}
export async function listCompanyAttendanceUsers(
  actor: Actor | null,
  input: unknown,
) {
  const data = companyAttendanceListSchema.parse(input)
  return transactAttendance(
    async (tx) => {
      await authorize(tx, actor)
      return repository.companyAttendanceUsers(tx, data)
    },
    { isolationLevel: 'repeatable read' },
  )
}
export async function readCompanyAttendanceUser(
  actor: Actor | null,
  input: unknown,
) {
  const data = companyAttendanceUserSchema.parse(input)
  return transactAttendance(
    async (tx) => {
      await authorize(tx, actor)
      const result = await repository.companyAttendanceUser(tx, data)
      if (!result) return null
      const serverNow = new Date().toISOString()
      return {
        ...result,
        serverNow,
        sessions: result.sessions.map((session) => ({
          ...session,
          startedAt: session.startedAt.toISOString(),
          endedAt: session.endedAt?.toISOString() ?? null,
          expectedStartAt: session.expectedStartAt.toISOString(),
          expectedEndAt: session.expectedEndAt.toISOString(),
        })),
      }
    },
    { isolationLevel: 'repeatable read' },
  )
}
