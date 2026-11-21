import { queryOptions } from '@tanstack/react-query'
import { getGpsHistory, getGpsMapDevices } from './gps.functions'
import type { GpsHistorySearch } from './gps.schemas'

export const gpsKey = (actorId: string) => ['gps', actorId] as const

export const gpsMapQuery = (
  actorId: string,
  q: string,
  includeDisabled = false,
) =>
  queryOptions({
    queryKey: [...gpsKey(actorId), 'map', q, includeDisabled],
    queryFn: () => getGpsMapDevices({ data: { q, includeDisabled } }),
  })
export type GpsMapDevice = Awaited<
  ReturnType<typeof getGpsMapDevices>
>['devices'][number]
export type GpsDeviceRow = GpsMapDevice
export type GpsLocatedDevice = GpsMapDevice & {
  position: NonNullable<GpsMapDevice['position']>
}
export const hasGpsPosition = (
  device: GpsMapDevice,
): device is GpsLocatedDevice => device.position !== null

export const gpsHistoryQuery = (
  actorId: string,
  deviceId: string,
  search: GpsHistorySearch,
) => {
  const rangeKey = [
    ...gpsKey(actorId),
    'history',
    deviceId,
    search.from,
    search.to,
  ] as const
  return queryOptions({
    queryKey: [...rangeKey, search.page] as const,
    queryFn: () => getGpsHistory({ data: { deviceId, ...search } }),
    placeholderData: (previous, query) =>
      rangeKey.every((value, index) => value === query?.queryKey[index])
        ? previous
        : undefined,
  })
}
export type GpsHistory = NonNullable<Awaited<ReturnType<typeof getGpsHistory>>>
