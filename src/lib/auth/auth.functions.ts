import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { readActor } from './session.server'
import { sessionMiddleware } from './auth.middleware'
import {
  permissionSchema,
  hasAnyPermission,
} from '#/lib/authorization/permissions'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { assertPermission } from '#/lib/authorization/access'
import { enforcePolicy } from '#/lib/authorization/guards.server'

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    return readActor()
  },
)

export const ensureSession = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware])
  .handler(({ context }) => context.actor)

export const requirePagePermission = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware])
  .validator(z.object({ permission: permissionSchema }).strict())
  .handler(({ data, context }) =>
    enforcePolicy(() => assertPermission(context.actor, data.permission)),
  )

export const requirePageAnyPermission = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware])
  .validator(
    z
      .object({
        permissions: z
          .array(permissionSchema)
          .min(1, 'მიუთითეთ წვდომის მოთხოვნა.')
          .max(permissionSchema.options.length, 'წვდომის მოთხოვნა არასწორია.'),
      })
      .strict(),
  )
  .handler(({ data, context }) =>
    enforcePolicy(() => {
      if (!hasAnyPermission(context.actor, data.permissions))
        throw new AuthorizationError()
    }),
  )
