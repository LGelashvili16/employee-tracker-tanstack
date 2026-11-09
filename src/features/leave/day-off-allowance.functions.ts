import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import {
  authenticatedMiddleware,
  permissionsMiddleware,
} from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  allowanceTargetSchema,
  adjustDayOffBalanceSchema,
  saveDayOffSettingSchema,
} from './day-off-allowance.schemas'
import {
  readDayOffSettings,
  readOwnDayOffBalance,
  readEmployeeDayOffBalance,
  adjustEmployeeDayOffBalance,
  saveDayOffSettings,
  DayOffAllowanceError,
} from './server/day-off-allowance.service.server'

async function safely<T>(action: () => Promise<T>) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(action) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    return {
      ok: false as const,
      message:
        error instanceof DayOffAllowanceError
          ? error.message
          : 'დასვენების დღეების მონაცემები ვერ განახლდა. სცადეთ ხელახლა.',
    }
  }
}
export const getDayOffSettings = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .handler(({ context }) => safely(() => readDayOffSettings(context.actor)))
export const getOwnDayOffBalance = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .handler(({ context }) => safely(() => readOwnDayOffBalance(context.actor)))
export const getEmployeeDayOffBalance = createServerFn({ method: 'GET' })
  .middleware([permissionsMiddleware('employees.manage')])
  .validator(allowanceTargetSchema)
  .handler(({ context, data }) =>
    safely(() => readEmployeeDayOffBalance(context.actor, data)),
  )
export const updateEmployeeDayOffBalance = createServerFn({ method: 'POST' })
  .middleware([permissionsMiddleware('employees.manage')])
  .validator(adjustDayOffBalanceSchema)
  .handler(({ context, data }) =>
    safely(() => adjustEmployeeDayOffBalance(context.actor, data)),
  )
export const updateDayOffSettings = createServerFn({ method: 'POST' })
  .middleware([permissionsMiddleware('leave.configure')])
  .validator(saveDayOffSettingSchema)
  .handler(({ context, data }) =>
    safely(() => saveDayOffSettings(context.actor, data)),
  )
