import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { authenticatedMiddleware } from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { timesheetRequestSchema } from './timesheets.schemas'
import { readTimesheets } from './server/timesheets.service.server'

async function safely<T>(read: () => Promise<T>) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(read) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    return {
      ok: false as const,
      message: 'სამუშაო საათები ვერ ჩაიტვირთა. სცადეთ ხელახლა.',
    }
  }
}
export const getOwnTimesheets = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(timesheetRequestSchema)
  .handler(({ context, data }) =>
    safely(() => readTimesheets(context.actor, data, 'self')),
  )
export const getCompanyTimesheets = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(timesheetRequestSchema)
  .handler(({ context, data }) =>
    safely(() => readTimesheets(context.actor, data, 'company')),
  )
