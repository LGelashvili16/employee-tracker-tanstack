import { queryOptions } from '@tanstack/react-query'
import { getGpsHistory, getGpsWorkspace } from './gps.functions'
import type { GpsHistorySearch, GpsSearch } from './gps.schemas'

export const gpsKey = (actorId: string) => ['gps', actorId] as const
export const gpsQuery = (actorId: string, search: GpsSearch) =>
  queryOptions({
    queryKey: [...gpsKey(actorId), search],
    queryFn: () => getGpsWorkspace({ data: search }),
  })
export type GpsDeviceRow = Awaited<
  ReturnType<typeof getGpsWorkspace>
>['rows'][number]

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
