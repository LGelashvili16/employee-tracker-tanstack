import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { finishMyWork, startMyWork } from '../attendance.functions'
import { attendanceKey } from '../attendance.queries'
import type { checkInSchema, checkOutSchema } from '../attendance.schemas'
import type { AttendanceOverview } from '../attendance.types'
import type { z } from 'zod'
import {
  ClockVerificationError,
  verifyClockIntent,
} from '#/features/attendance-security/verify-clock'

type ClockAction =
  | { kind: 'in'; data: z.infer<typeof checkInSchema> }
  | { kind: 'out'; data: z.infer<typeof checkOutSchema> }

export function useAttendanceActions(
  actorId: string,
  overview: AttendanceOverview,
) {
  const start = useServerFn(startMyWork)
  const finish = useServerFn(finishMyWork)
  const client = useQueryClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const request = useRef<z.infer<typeof checkInSchema> | null>(null)
  const mutation = useMutation({
    mutationFn: async (action: ClockAction) => {
      const proof = await verifyClockIntent(action)
      return action.kind === 'in'
        ? start({ data: proof })
        : finish({ data: proof })
    },
    retry: false,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: attendanceKey(actorId) }),
        client.invalidateQueries({
          queryKey: ['attendance-security', 'status', actorId],
        }),
      ]),
  })
  async function execute(action: ClockAction) {
    let verificationMessage: string | undefined
    const result = await mutation
      .mutateAsync(action)
      .catch((error: unknown) => {
        if (error instanceof ClockVerificationError)
          verificationMessage = error.message
        return null
      })
    if (result?.ok) {
      setErrorMessage(null)
      toast.success(
        action.kind === 'in'
          ? 'სამუშაოს დაწყება დაფიქსირდა.'
          : 'სამუშაოს დასრულება დაფიქსირდა.',
      )
      if (action.kind === 'in') request.current = null
    } else {
      setErrorMessage(
        result?.message ??
          verificationMessage ??
          'მოთხოვნა ვერ დასრულდა. გადაამოწმეთ დასწრების მდგომარეობა.',
      )
      toast.error(
        result
          ? result.message
          : (verificationMessage ??
              'მოთხოვნა ვერ დასრულდა. გადაამოწმეთ დასწრების მდგომარეობა ხელახლა ცდამდე.'),
      )
    }
    return result?.ok ?? false
  }
  return {
    errorMessage,
    pending: mutation.isPending,
    start: (confirmNonWorkingDay = false) => {
      // Retain an operation key across a lost response; retries must not create another working interval.
      if (
        !request.current ||
        request.current.expectedLastSessionId !== overview.lastSessionId ||
        request.current.confirmedNonWorkingDate !==
          (confirmNonWorkingDay ? overview.workday.date : undefined)
      )
        request.current = {
          requestId: crypto.randomUUID(),
          expectedLastSessionId: overview.lastSessionId,
          confirmedNonWorkingDate: confirmNonWorkingDay
            ? overview.workday.date
            : undefined,
        }
      return execute({ kind: 'in', data: request.current })
    },
    finish: (confirmEarly: boolean) =>
      overview.openSession
        ? execute({
            kind: 'out',
            data: { sessionId: overview.openSession.id, confirmEarly },
          })
        : Promise.resolve(false),
  }
}
