import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { authenticatedMiddleware } from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  complaintAssignSchema,
  complaintDetailSchema,
  complaintListSchema,
  complaintReplySchema,
  complaintReviewersSchema,
  complaintStatusChangeSchema,
  createComplaintSchema,
} from './complaints.schemas'
import {
  assignComplaint,
  changeComplaintStatus,
  complaintDetail,
  complaintReviewers,
  ComplaintWorkflowError,
  createComplaint,
  listComplaints,
  replyToComplaint,
} from './server/complaints.service.server'

async function safely<T>(action: () => Promise<T>) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(action) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    return {
      ok: false as const,
      message:
        error instanceof ComplaintWorkflowError
          ? error.message
          : 'მოთხოვნა ვერ შესრულდა. სცადეთ ხელახლა.',
    }
  }
}
export const getComplaints = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(complaintListSchema)
  .handler(({ context, data }) =>
    safely(() => listComplaints(context.actor, data)),
  )
export const getComplaint = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(complaintDetailSchema)
  .handler(({ context, data }) =>
    safely(() => complaintDetail(context.actor, data)),
  )
export const submitComplaint = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(createComplaintSchema)
  .handler(({ context, data }) =>
    safely(() => createComplaint(context.actor, data)),
  )
export const sendComplaintReply = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(complaintReplySchema)
  .handler(({ context, data }) =>
    safely(() => replyToComplaint(context.actor, data)),
  )
export const decideComplaint = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(complaintStatusChangeSchema)
  .handler(({ context, data }) =>
    safely(() => changeComplaintStatus(context.actor, data)),
  )
export const setComplaintAssignee = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(complaintAssignSchema)
  .handler(({ context, data }) =>
    safely(() => assignComplaint(context.actor, data)),
  )
export const getComplaintReviewers = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(complaintReviewersSchema)
  .handler(({ context, data }) =>
    safely(() => complaintReviewers(context.actor, data)),
  )
