import { createManualAttendance } from './server/manual-attendance.service.server'
import { z } from 'zod'
import { recordIdSchema } from '#/lib/route-schemas'
import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { authenticatedMiddleware } from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { recordClockDenial } from '#/features/attendance-security/server/attendance-security.service.server'
import type { Actor } from '#/lib/authorization/actor'
import { clockProofSchema } from '#/features/attendance-security/attendance-security.schemas'
import {
  AttendanceSecurityError,
  clockSecurityContext,
} from '#/features/attendance-security/server/attendance-security-context.server'
import {
  AttendanceWorkflowError,
  checkIn,
  checkOut,
  getAttendanceOverview,
  getAssistedClockState,
  readEmployeeCorrections,
  readEmployeeDaySessions,
} from './server/attendance.service.server'
import {
  attendanceCorrectionsSchema,
  employeeSessionListSchema,
  attendanceAssignmentSchema,
  attendanceCorrectionSchema,
  manualAttendanceSchema,
  attendanceHistorySchema,
  attendanceLimitSchema,
  attendanceReviewSchema,
} from './attendance.schemas'
import {
  assignAttendanceReviewer,
  attendanceReviewHistory,
  correctAttendance,
  readAttendanceConfiguration,
  reviewAttendance,
  saveAttendanceLimit,
} from './server/attendance-review.service.server'
import {
  companyAttendanceListSchema,
  companyAttendanceUserSchema,
} from './company-attendance.schemas'
import {
  listCompanyAttendanceUsers,
  readCompanyAttendanceUser,
} from './server/company-attendance.service.server'

async function safely<T>(action: () => Promise<T>, actor?: Actor) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(action) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    if (actor && error instanceof AttendanceSecurityError)
      await recordClockDenial(actor.id, error.message).catch(() => undefined)
    return {
      ok: false as const,
      message:
        error instanceof AttendanceWorkflowError ||
        error instanceof AttendanceSecurityError
          ? error.message
          : 'დასწრების მონაცემები ვერ დამუშავდა. სცადეთ ხელახლა.',
    }
  }
}
export const readAssistedClockState = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(z.object({ userId: recordIdSchema }))
  .handler(({ context, data }) =>
    safely(() => getAssistedClockState(context.actor, data.userId)),
  )
export const readMyAttendance = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .handler(({ context }) => safely(() => getAttendanceOverview(context.actor)))
export const readMyAttendanceCorrections = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(attendanceCorrectionsSchema)
  .handler(({ context, data }) =>
    safely(() => readEmployeeCorrections(context.actor, data)),
  )
export const readMyAttendanceSessions = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(employeeSessionListSchema)
  .handler(({ context, data }) =>
    safely(() => readEmployeeDaySessions(context.actor, data)),
  )
export const startMyWork = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(clockProofSchema)
  .handler(({ context, data }) =>
    safely(async () => {
      if (data.intent.kind !== 'in') throw new AuthorizationError()
      return checkIn(
        context.actor,
        data.intent.data,
        await clockSecurityContext(context.actor, true),
        data,
      )
    }, context.actor),
  )
export const finishMyWork = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(clockProofSchema)
  .handler(({ context, data }) =>
    safely(async () => {
      if (data.intent.kind !== 'out') throw new AuthorizationError()
      return checkOut(
        context.actor,
        data.intent.data,
        await clockSecurityContext(context.actor, true),
        data,
      )
    }, context.actor),
  )

export const readCompanyAttendanceUsers = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(companyAttendanceListSchema)
  .handler(({ context, data }) =>
    safely(() => listCompanyAttendanceUsers(context.actor, data)),
  )
export const readCompanyUserAttendance = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(companyAttendanceUserSchema)
  .handler(({ context, data }) =>
    safely(() => readCompanyAttendanceUser(context.actor, data)),
  )
export const decideAttendance = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(attendanceReviewSchema)
  .handler(({ context, data }) =>
    safely(() => reviewAttendance(context.actor, data)),
  )
export const amendAttendance = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(attendanceCorrectionSchema)
  .handler(({ context, data }) =>
    safely(() => correctAttendance(context.actor, data)),
  )
export const readAttendanceSettings = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .handler(({ context }) =>
    safely(() => readAttendanceConfiguration(context.actor)),
  )
export const updateAttendanceLimit = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(attendanceLimitSchema)
  .handler(({ context, data }) =>
    safely(() => saveAttendanceLimit(context.actor, data)),
  )
export const updateAttendanceReviewer = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(attendanceAssignmentSchema)
  .handler(({ context, data }) =>
    safely(() => assignAttendanceReviewer(context.actor, data)),
  )
export const readAttendanceReviewHistory = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(attendanceHistorySchema)
  .handler(({ context, data }) =>
    safely(() => attendanceReviewHistory(context.actor, data)),
  )

export const recordManualAttendance = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(manualAttendanceSchema)
  .handler(({ context, data }) =>
    safely(() => createManualAttendance(context.actor, data)),
  )
