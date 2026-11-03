import { createServerFn } from '@tanstack/react-start'
import { setResponseStatus } from '@tanstack/react-start/server'
import { z } from 'zod'
import { readActor } from './session.server'
import { sessionMiddleware } from './auth.middleware'
import { permissionSchema } from '#/lib/authorization/permissions'
import { assertPermission } from '#/lib/authorization/access'

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
  .handler(({ data, context }) => {
    try {
      return assertPermission(context.actor, data.permission)
    } catch (error) {
      setResponseStatus(403)
      throw error
    }
  })
