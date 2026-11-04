import { queryOptions } from '@tanstack/react-query'
import { readMyAttendance } from './attendance.functions'

export const attendanceKey = (actorId: string) =>
  ['my-attendance', actorId] as const
export const attendanceOptions = (actorId: string) =>
  queryOptions({
    queryKey: attendanceKey(actorId),
    queryFn: () => readMyAttendance(),
    staleTime: 15_000,
    refetchInterval: (query) =>
      query.state.error || query.state.data?.ok === false ? false : 60_000,
    refetchOnWindowFocus: (query) =>
      !query.state.error && query.state.data?.ok !== false,
    retry: false,
  })
