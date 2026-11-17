import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { authenticatedMiddleware } from '#/lib/auth/auth.middleware'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { recordIdSchema } from '#/lib/route-schemas'
import { z } from 'zod'
import {
  clockIntentSchema,
  deviceDecisionSchema,
  employeeNetworkSchema,
  registerDeviceSchema,
  registrationProofSchema,
  securityListSchema,
  securityPolicySchema,
} from './attendance-security.schemas'
import * as service from './server/attendance-security.service.server'
import {
  AttendanceSecurityError,
  clockSecurityContext,
  issueBrowserCookie,
} from './server/attendance-security-context.server'

async function safelySecurity<T>(action: () => Promise<T>) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(action) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    return {
      ok: false as const,
      message:
        error instanceof AttendanceSecurityError
          ? error.message
          : 'უსაფრთხოების მოთხოვნა ვერ შესრულდა. სცადეთ ხელახლა.',
    }
  }
}
export const readAttendanceDeviceStatus = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .handler(({ context }) =>
    safelySecurity(async () =>
      service.deviceStatus(
        context.actor,
        await clockSecurityContext(context.actor),
      ),
    ),
  )

export const registerAutomaticAttendanceDevice = createServerFn({
  method: 'POST',
})
  .middleware([authenticatedMiddleware])
  .handler(({ context }) =>
    safelySecurity(async () =>
      service.registerAutomaticDevice(
        context.actor,
        issueBrowserCookie(await clockSecurityContext(context.actor, true)),
      ),
    ),
  )

export const readOwnDevices = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(securityListSchema)
  .handler(({ context, data }) =>
    safelySecurity(async () =>
      service.ownDevices(
        context.actor,
        data,
        await clockSecurityContext(context.actor),
      ),
    ),
  )
export const requestAttendanceDevice = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(registerDeviceSchema)
  .handler(({ context, data }) =>
    safelySecurity(async () =>
      service.requestDevice(
        context.actor,
        data,
        issueBrowserCookie(await clockSecurityContext(context.actor, true)),
        true,
      ),
    ),
  )
export const registerAttendancePasskey = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .handler(({ context }) =>
    safelySecurity(async () =>
      service.beginRegistration(
        context.actor,
        await clockSecurityContext(context.actor, true),
      ),
    ),
  )
export const verifyAttendanceRegistration = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(registrationProofSchema)
  .handler(({ context, data }) =>
    safelySecurity(async () =>
      service.finishRegistration(
        context.actor,
        data,
        await clockSecurityContext(context.actor, true),
      ),
    ),
  )
export const prepareAttendanceClock = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(clockIntentSchema)
  .handler(({ context, data }) =>
    safelySecurity(async () => {
      const security = issueBrowserCookie(
        await clockSecurityContext(context.actor, true),
      )
      try {
        return await service.prepareClock(context.actor, data, security)
      } catch (error) {
        if (error instanceof AttendanceSecurityError)
          await service
            .recordClockDenial(context.actor.id, error.message)
            .catch(() => undefined)
        throw error
      }
    }),
  )
export const readDeviceRequests = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(securityListSchema)
  .handler(({ context, data }) =>
    safelySecurity(() => service.reviewDevices(context.actor, data)),
  )
export const reviewAttendanceDevice = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(deviceDecisionSchema)
  .handler(({ context, data }) =>
    safelySecurity(async () => {
      await clockSecurityContext(context.actor, true)
      return service.decideDevice(context.actor, data)
    }),
  )
export const readAttendanceSecurityPolicy = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .handler(({ context }) =>
    safelySecurity(() => service.securitySettings(context.actor)),
  )
export const updateAttendanceSecurityPolicy = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(securityPolicySchema)
  .handler(({ context, data }) =>
    safelySecurity(async () =>
      service.saveSecuritySettings(
        context.actor,
        data,
        await clockSecurityContext(context.actor, true),
      ),
    ),
  )
export const readAttendanceEmployeeNetwork = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(z.object({ userId: recordIdSchema }))
  .handler(({ context, data }) =>
    safelySecurity(() =>
      service.readEmployeeNetwork(context.actor, data.userId),
    ),
  )
export const updateAttendanceEmployeeNetwork = createServerFn({
  method: 'POST',
})
  .middleware([authenticatedMiddleware])
  .validator(employeeNetworkSchema)
  .handler(({ context, data }) =>
    safelySecurity(async () => {
      await clockSecurityContext(context.actor, true)
      return service.saveEmployeeNetwork(context.actor, data)
    }),
  )
