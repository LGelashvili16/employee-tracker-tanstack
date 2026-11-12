import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { authenticatedMiddleware } from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  AttendanceWorkflowError,
  checkIn,
  checkOut,
  getAttendanceOverview,
  readEmployeeCorrections,
} from './server/attendance.service.server'
import {
  checkInSchema,
  attendanceCorrectionsSchema,
  checkOutSchema,
  attendanceAssignmentSchema,
  attendanceCorrectionSchema,
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

async function safely<T>(action: () => Promise<T>) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(action) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    return {
      ok: false as const,
      message:
        error instanceof AttendanceWorkflowError
          ? error.message
          : 'დასწრების მონაცემები ვერ დამუშავდა. სცადეთ ხელახლა.',
    }
  }
}
export const readMyAttendance = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .handler(({ context }) => safely(() => getAttendanceOverview(context.actor)))
export const readMyAttendanceCorrections = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(attendanceCorrectionsSchema)
  .handler(({ context, data }) =>
    safely(() => readEmployeeCorrections(context.actor, data)),
  )
export const startMyWork = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(checkInSchema)
  .handler(({ context, data }) => safely(() => checkIn(context.actor, data)))
export const finishMyWork = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(checkOutSchema)
  .handler(({ context, data }) => safely(() => checkOut(context.actor, data)))

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
