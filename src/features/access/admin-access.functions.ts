import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { permissionsMiddleware } from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { AccountWorkflowError } from './server/access.service.server'
import {
  listAdminAccounts,
  updateAccountAuthorization,
  administerAccount,
} from './server/admin-access.service.server'
import {
  adminAccountActionSchema,
  adminAccountListSchema,
  updateAccountAuthorizationSchema,
} from './admin-access.schemas'

async function safe<T>(action: () => Promise<T>) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(action) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    return {
      ok: false as const,
      message:
        error instanceof AccountWorkflowError
          ? error.message
          : 'მოქმედება ვერ შესრულდა. განაახლეთ გვერდი და სცადეთ ხელახლა.',
    }
  }
}
const accessAdministrator = permissionsMiddleware(
  'admin.access',
  'users.manage',
)
export const getAdminAccounts = createServerFn({ method: 'GET' })
  .middleware([accessAdministrator])
  .validator(adminAccountListSchema)
  .handler(({ context, data }) =>
    safe(() => listAdminAccounts(context.actor, data)),
  )
export const saveAccountAuthorization = createServerFn({ method: 'POST' })
  .middleware([accessAdministrator])
  .validator(updateAccountAuthorizationSchema)
  .handler(({ context, data }) =>
    safe(() => updateAccountAuthorization(context.actor, data)),
  )
export const performAdminAccountAction = createServerFn({ method: 'POST' })
  .middleware([accessAdministrator])
  .validator(adminAccountActionSchema)
  .handler(({ context, data }) =>
    safe(() => administerAccount(context.actor, data)),
  )
