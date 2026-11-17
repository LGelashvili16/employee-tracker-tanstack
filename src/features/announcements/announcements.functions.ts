import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import {
  authenticatedMiddleware,
  permissionsMiddleware,
} from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  acknowledgeAnnouncementSchema,
  announcementLookupSchema,
  announcementSearchSchema,
  publishAnnouncementSchema,
} from './announcements.schemas'
import {
  acknowledgeAnnouncement,
  AnnouncementError,
  getAnnouncement,
  getLoginAnnouncement,
  listAnnouncements,
  publishAnnouncement,
} from './server/announcements.service.server'
import { currentLoginAt } from './server/announcements-session.server'

async function safely<T>(action: () => Promise<T>) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(action) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    return {
      ok: false as const,
      message:
        error instanceof AnnouncementError
          ? error.message
          : 'მოქმედება ვერ შესრულდა. სცადეთ ხელახლა.',
    }
  }
}
export const getAnnouncements = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(announcementSearchSchema)
  .handler(({ context, data }) =>
    safely(() => listAnnouncements(context.actor, data)),
  )
export const getAnnouncementDetail = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(announcementLookupSchema)
  .handler(({ context, data }) =>
    safely(() => getAnnouncement(context.actor, data)),
  )
export const getPendingAnnouncement = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .handler(({ context }) =>
    safely(async () =>
      getLoginAnnouncement(
        context.actor,
        await currentLoginAt(context.actor.id),
      ),
    ),
  )
export const createAnnouncement = createServerFn({ method: 'POST' })
  .middleware([permissionsMiddleware('announcements.manage')])
  .validator(publishAnnouncementSchema)
  .handler(({ context, data }) =>
    safely(() => publishAnnouncement(context.actor, data)),
  )
export const markAnnouncement = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(acknowledgeAnnouncementSchema)
  .handler(({ context, data }) =>
    safely(() => acknowledgeAnnouncement(context.actor, data)),
  )
