import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { permissionsMiddleware } from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { saveCompanyScheduleSchema } from './scheduling.schemas'
import {
  readScheduleSettings,
  saveScheduleVersion,
  ScheduleWorkflowError,
} from './server/scheduling.service.server'

async function safely<T>(action: () => Promise<T>) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(action) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    return {
      ok: false as const,
      message:
        error instanceof ScheduleWorkflowError
          ? error.message
          : 'განრიგის შენახვა ან ჩატვირთვა ვერ მოხერხდა. სცადეთ ხელახლა.',
    }
  }
}
const administrator = permissionsMiddleware('attendance.configure')
export const getScheduleSettings = createServerFn({ method: 'GET' })
  .middleware([administrator])
  .handler(({ context }) => safely(() => readScheduleSettings(context.actor)))
export const createScheduleVersion = createServerFn({ method: 'POST' })
  .middleware([administrator])
  .validator(saveCompanyScheduleSchema)
  .handler(({ data, context }) =>
    safely(() => saveScheduleVersion(context.actor, data)),
  )
