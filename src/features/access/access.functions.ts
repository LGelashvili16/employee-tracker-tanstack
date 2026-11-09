import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { permissionsMiddleware } from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  accountActionSchema,
  accountListSchema,
  accountLookupSchema,
  employeeDetailsSchema,
  provisionAccountSchema,
} from './access.schemas'
import {
  AccountWorkflowError,
  editEmployeeDetails,
  listEmployeeAccounts,
  manageEmployeeAccount,
  provisionEmployee,
  readEmployeeAccount,
} from './server/access.service.server'

async function safeAccessAction<T>(action: () => Promise<T>) {
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
          : 'მოქმედება ვერ შესრულდა. გადაამოწმეთ მომხმარებლის სახელისა და ელფოსტის უნიკალურობა და სცადეთ ხელახლა.',
    }
  }
}
const employeeManager = permissionsMiddleware(
  'manage.access',
  'employees.manage',
)
export const listAccounts = createServerFn({ method: 'GET' })
  .middleware([employeeManager])
  .validator(accountListSchema)
  .handler(({ data, context }) =>
    safeAccessAction(() => listEmployeeAccounts(context.actor, data)),
  )
export const getEmployeeAccount = createServerFn({ method: 'GET' })
  .middleware([employeeManager])
  .validator(accountLookupSchema)
  .handler(({ data, context }) =>
    safeAccessAction(() => readEmployeeAccount(context.actor, data)),
  )
export const createEmployeeAccount = createServerFn({ method: 'POST' })
  .middleware([employeeManager])
  .validator(provisionAccountSchema)
  .handler(({ data, context }) =>
    safeAccessAction(() => provisionEmployee(context.actor, data)),
  )
export const updateEmployeeAccount = createServerFn({ method: 'POST' })
  .middleware([employeeManager])
  .validator(accountActionSchema)
  .handler(({ data, context }) =>
    safeAccessAction(() => manageEmployeeAccount(context.actor, data)),
  )
export const updateEmployeeDetails = createServerFn({ method: 'POST' })
  .middleware([employeeManager])
  .validator(employeeDetailsSchema)
  .handler(({ data, context }) =>
    safeAccessAction(() => editEmployeeDetails(context.actor, data)),
  )
