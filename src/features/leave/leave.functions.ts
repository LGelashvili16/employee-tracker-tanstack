import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import {
  authenticatedMiddleware,
  permissionsMiddleware,
} from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { DayOffAllowanceError } from './server/day-off-allowance.service.server'
import {
  createLeaveSchema,
  leaveSearchSchema,
  reviewLeaveSchema,
  cancelLeaveSchema,
  closeSickLeaveSchema,
} from './leave.schemas'
import {
  createLeave,
  listLeave,
  reviewLeave,
  LeaveWorkflowError,
  cancelLeave,
  closeSickLeave,
} from './server/leave.service.server'

async function safely<T>(action: () => Promise<T>) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(action) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    return {
      ok: false as const,
      message:
        error instanceof LeaveWorkflowError ||
        error instanceof DayOffAllowanceError
          ? error.message
          : 'მოთხოვნა ვერ შესრულდა. სცადეთ ხელახლა.',
    }
  }
}
const reviewer = permissionsMiddleware('leave.review')
export const getOwnLeave = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(leaveSearchSchema)
  .handler(({ context, data }) => safely(() => listLeave(context.actor, data)))
export const getReviewLeave = createServerFn({ method: 'GET' })
  .middleware([reviewer])
  .validator(leaveSearchSchema)
  .handler(({ context, data }) =>
    safely(() => listLeave(context.actor, data, true)),
  )
export const submitLeave = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(createLeaveSchema)
  .handler(({ context, data }) =>
    safely(() => createLeave(context.actor, data)),
  )
export const decideLeave = createServerFn({ method: 'POST' })
  .middleware([reviewer])
  .validator(reviewLeaveSchema)
  .handler(({ context, data }) =>
    safely(() => reviewLeave(context.actor, data)),
  )
export const withdrawLeave = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(cancelLeaveSchema)
  .handler(({ context, data }) =>
    safely(() => cancelLeave(context.actor, data)),
  )

export const finishSickLeave = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(closeSickLeaveSchema)
  .handler(({ context, data }) =>
    safely(() => closeSickLeave(context.actor, data)),
  )
