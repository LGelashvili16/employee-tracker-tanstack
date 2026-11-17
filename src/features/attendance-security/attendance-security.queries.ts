import { queryOptions } from '@tanstack/react-query'
import {
  readAttendanceEmployeeNetwork,
  readAttendanceSecurityPolicy,
  readDeviceRequests,
  readOwnDevices,
  readAttendanceDeviceStatus,
} from './attendance-security.functions'
import { readAssistedClockState } from '#/features/attendance/attendance.functions'
import { securityListSchema } from './attendance-security.schemas'
import type { z } from 'zod'

export const deviceStatusOptions = (actorId: string) =>
  queryOptions({
    queryKey: ['attendance-security', 'status', actorId],
    queryFn: () => readAttendanceDeviceStatus(),
    retry: false,
    refetchInterval: 30000,
  })

export const ownDevicesOptions = (
  actorId: string,
  input: z.input<typeof securityListSchema>,
) => {
  const data = securityListSchema.parse(input)
  return queryOptions({
    queryKey: ['attendance-security', 'own', actorId, data],
    queryFn: () => readOwnDevices({ data }),
    retry: false,
    refetchInterval: 30000,
  })
}
export const deviceReviewOptions = (
  actorId: string,
  input: z.input<typeof securityListSchema>,
) => {
  const data = securityListSchema.parse(input)
  return queryOptions({
    queryKey: ['attendance-security', 'review', actorId, data],
    queryFn: () => readDeviceRequests({ data }),
    retry: false,
    refetchInterval: 30000,
  })
}
export const securityPolicyOptions = (actorId: string) =>
  queryOptions({
    queryKey: ['attendance-security', 'policy', actorId],
    queryFn: () => readAttendanceSecurityPolicy(),
    retry: false,
  })
export const employeeNetworkOptions = (actorId: string, userId: string) =>
  queryOptions({
    queryKey: ['attendance-security', 'network', actorId, userId],
    queryFn: () => readAttendanceEmployeeNetwork({ data: { userId } }),
    retry: false,
  })
export const assistedClockOptions = (actorId: string, userId: string) =>
  queryOptions({
    queryKey: ['attendance-security', 'assisted', actorId, userId],
    queryFn: () => readAssistedClockState({ data: { userId } }),
    retry: false,
  })
