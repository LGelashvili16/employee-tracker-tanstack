import { queryOptions } from '@tanstack/react-query'
import {
  readCompanyAttendanceUsers,
  readCompanyUserAttendance,
} from './attendance.functions'
import {
  companyAttendanceListSchema,
  companyAttendanceUserSchema,
} from './company-attendance.schemas'
import type { z } from 'zod'

export const companyAttendanceUsersQuery = (
  actorId: string,
  input: z.input<typeof companyAttendanceListSchema>,
) => {
  const data = companyAttendanceListSchema.parse(input)
  return queryOptions({
    queryKey: ['company-attendance-users', actorId, data],
    queryFn: async () => {
      const result = await readCompanyAttendanceUsers({ data })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    retry: false,
    staleTime: 30_000,
  })
}
export const companyAttendanceUserQuery = (
  actorId: string,
  input: z.input<typeof companyAttendanceUserSchema>,
) => {
  const data = companyAttendanceUserSchema.parse(input)
  return queryOptions({
    queryKey: ['company-attendance-user', actorId, data],
    queryFn: async () => {
      const result = await readCompanyUserAttendance({ data })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    retry: false,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}
