import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { authenticatedMiddleware } from '#/lib/auth/auth.middleware'
import { ownPhoneSchema } from '#/features/access/access.schemas'
import {
  AccountWorkflowError,
  readOwnProfile,
  updateOwnPhone,
} from '#/features/access/server/access.service.server'

/** Profile data is personal, so it is never stored by shared caches. */
export const getOwnProfile = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .handler(({ context }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    return readOwnProfile(context.actor)
  })

export const updateOwnProfilePhone = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(ownPhoneSchema)
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    try {
      return {
        ok: true as const,
        value: await updateOwnPhone(context.actor, data),
      }
    } catch (error) {
      return {
        ok: false as const,
        message:
          error instanceof AccountWorkflowError
            ? error.message
            : 'ტელეფონის ნომერი ვერ შეინახა. სცადეთ ხელახლა.',
      }
    }
  })
