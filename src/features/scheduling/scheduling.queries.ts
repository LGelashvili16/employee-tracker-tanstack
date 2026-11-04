import { queryOptions } from '@tanstack/react-query'
import { getScheduleSettings } from './scheduling.functions'

export const scheduleSettingsKey = (actorId: string) =>
  ['company-schedule-settings', actorId] as const
export const scheduleSettingsOptions = (actorId: string) =>
  queryOptions({
    queryKey: scheduleSettingsKey(actorId),
    queryFn: () => getScheduleSettings(),
    retry: false,
    refetchOnWindowFocus: false,
  })
