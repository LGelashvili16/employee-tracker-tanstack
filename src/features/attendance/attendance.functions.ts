import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { authenticatedMiddleware } from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { checkInSchema, checkOutSchema } from './attendance.schemas'
import {
  AttendanceWorkflowError,
  checkIn,
  checkOut,
  getAttendanceOverview,
} from './server/attendance.service.server'

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
export const startMyWork = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(checkInSchema)
  .handler(({ context, data }) => safely(() => checkIn(context.actor, data)))
export const finishMyWork = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(checkOutSchema)
  .handler(({ context, data }) => safely(() => checkOut(context.actor, data)))
