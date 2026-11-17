import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { authenticatedMiddleware } from '#/lib/auth/auth.middleware'
import {
  markNotificationsSeenSchema,
  markAllNotificationsSeenSchema,
  notificationListSchema,
} from './notifications.schemas'
import {
  listOwnNotifications,
  markOwnNotificationsSeen,
  markOwnNotificationsUnseen,
  markAllOwnNotificationsSeen,
} from './server/notifications.service.server'

export const getOwnNotifications = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(notificationListSchema)
  .handler(async ({ context, data }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    try {
      return {
        ok: true as const,
        value: await listOwnNotifications(context.actor, data),
      }
    } catch {
      return {
        ok: false as const,
        message: 'შეტყობინებები ვერ ჩაიტვირთა. სცადეთ ხელახლა.',
      }
    }
  })

export const markOwnNotifications = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(markNotificationsSeenSchema)
  .handler(async ({ context, data }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    try {
      return {
        ok: true as const,
        value: await markOwnNotificationsSeen(context.actor, data),
      }
    } catch {
      return {
        ok: false as const,
        message: 'მონიშვნა ვერ მოხერხდა. სცადეთ ხელახლა.',
      }
    }
  })

export const markOwnNotificationsAsUnseen = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(markNotificationsSeenSchema)
  .handler(async ({ context, data }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    try {
      return {
        ok: true as const,
        value: await markOwnNotificationsUnseen(context.actor, data),
      }
    } catch {
      return {
        ok: false as const,
        message: 'მონიშვნა ვერ მოხერხდა. სცადეთ ხელახლა.',
      }
    }
  })

export const markAllOwnNotifications = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(markAllNotificationsSeenSchema)
  .handler(async ({ context }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    try {
      return {
        ok: true as const,
        value: await markAllOwnNotificationsSeen(context.actor),
      }
    } catch {
      return {
        ok: false as const,
        message: 'მონიშვნა ვერ მოხერხდა. სცადეთ ხელახლა.',
      }
    }
  })
