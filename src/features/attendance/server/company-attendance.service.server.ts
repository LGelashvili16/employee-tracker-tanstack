import '@tanstack/react-start/server-only'
import { hasPermission } from '#/lib/authorization/permissions'
import { authorizeAttendanceWorkspace } from './attendance-review.policy.server'
import { transactAttendance } from './attendance.repository.server'
import {
  companyAttendanceListSchema,
  companyAttendanceUserSchema,
} from '../company-attendance.schemas'
import * as repository from './company-attendance.repository.server'
import type { Actor } from '#/lib/authorization/actor'
import { getCompanyWorkday } from '#/features/scheduling/server/scheduling.service.server'

export async function listCompanyAttendanceUsers(
  actor: Actor | null,
  input: unknown,
) {
  const data = companyAttendanceListSchema.parse(input)
  return transactAttendance(
    async (tx) => {
      const access = await authorizeAttendanceWorkspace(tx, actor)
      const result = await repository.companyAttendanceUsers(
        tx,
        data,
        access.company ? undefined : access.actor.id,
      )
      return {
        ...result,
        scope: access.company ? ('company' as const) : ('assigned' as const),
      }
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
      const access = await authorizeAttendanceWorkspace(tx, actor)
      // Load assignment facts even for company readers so read access never implies mutation rights.
      const now = new Date()
      const workday = await getCompanyWorkday(now, tx)
      const date = data.date ?? workday.date
      const result = await repository.companyAttendanceUser(
        tx,
        { ...data, date },
        access.company ? undefined : access.actor.id,
        access.canReadAttendance,
      )
      if (!result) return null
      const canReview =
        result.subject.userId !== access.actor.id &&
        hasPermission(access.actor, 'attendance.read.team') &&
        hasPermission(access.actor, 'attendance.review.team') &&
        (access.company
          ? await repository.isAssignedReviewer(
              tx,
              access.actor.id,
              result.subject.employeeId,
            )
          : result.subject.assigned)
      const serverNow = now.toISOString()
      return {
        ...result,
        serverNow,
        date,
        today: workday.date,
        companyTimezone: workday.timezone,
        canReadAttendance: access.canReadAttendance,
        canReadTimesheets: access.canReadTimesheets,
        sessions: result.sessions.map((session) => ({
          ...session,
          canReview,
          employeeName: result.subject.name,
          workDate: session.date,
          startedAt: session.startedAt.toISOString(),
          endedAt: session.endedAt?.toISOString() ?? null,
          expectedStartAt: session.expectedStartAt.toISOString(),
          expectedEndAt: session.expectedEndAt.toISOString(),
          originalStartedAt: session.originalStartedAt?.toISOString() ?? null,
          originalEndedAt: session.originalEndedAt?.toISOString() ?? null,
        })),
      }
    },
    { isolationLevel: 'repeatable read' },
  )
}
