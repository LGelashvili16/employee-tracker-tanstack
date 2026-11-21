import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { permissionsMiddleware } from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import {
  gpsDeviceParams,
  gpsHistoryInput,
  gpsMapSchema,
  gpsSaveSchema,
} from './gps.schemas'
import {
  readGpsDiagnostics,
  readGpsHistory,
  readGpsMapDevices,
  saveGpsDevice,
} from './server/gps-management.service.server'

export const getGpsDiagnostics = createServerFn({ method: 'GET' })
  .middleware([permissionsMiddleware('manage.access', 'gps.read')])
  .validator(gpsDeviceParams)
  .handler(({ context, data }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    return enforcePolicy(() => readGpsDiagnostics(context.actor, data.deviceId))
  })

export const getGpsHistory = createServerFn({ method: 'GET' })
  .middleware([permissionsMiddleware('manage.access', 'gps.read')])
  .validator(gpsHistoryInput)
  .handler(({ context, data }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    return enforcePolicy(() => readGpsHistory(context.actor, data))
  })

export const getGpsMapDevices = createServerFn({ method: 'GET' })
  .middleware([permissionsMiddleware('manage.access', 'gps.read')])
  .validator(gpsMapSchema)
  .handler(({ context, data }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    return enforcePolicy(() => readGpsMapDevices(context.actor, data))
  })

export const updateGpsDevice = createServerFn({ method: 'POST' })
  .middleware([
    permissionsMiddleware('manage.access', 'gps.read', 'gps.manage'),
  ])
  .validator(gpsSaveSchema)
  .handler(({ context, data }) => {
    setResponseHeader('Cache-Control', 'private, no-store')
    return enforcePolicy(() => saveGpsDevice(context.actor, data))
  })
