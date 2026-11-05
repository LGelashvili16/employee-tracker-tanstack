import { queryOptions } from '@tanstack/react-query'
import { getOwnSchedule, getScheduleSettings } from './scheduling.functions'

/** Keyed by account so one person's week is never served to the next user of the same browser. */
export const ownScheduleOptions = (actorId: string) =>
  queryOptions({
    queryKey: ['own-schedule', actorId],
    queryFn: () => getOwnSchedule(),
    retry: false,
  })

export const scheduleSettingsKey = (actorId: string) =>
  ['company-schedule-settings', actorId] as const
export const scheduleSettingsOptions = (actorId: string) =>
  queryOptions({
    queryKey: scheduleSettingsKey(actorId),
    queryFn: () => getScheduleSettings(),
    retry: false,
    refetchOnWindowFocus: false,
  })
