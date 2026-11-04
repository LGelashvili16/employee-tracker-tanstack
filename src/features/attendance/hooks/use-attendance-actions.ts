import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { finishMyWork, startMyWork } from '../attendance.functions'
import { attendanceKey } from '../attendance.queries'
import { checkInSchema, checkOutSchema } from '../attendance.schemas'
import type { AttendanceOverview } from '../attendance.types'
import type { z } from 'zod'

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
  const request = useRef<z.infer<typeof checkInSchema> | null>(null)
  const mutation = useMutation({
    mutationFn: (action: ClockAction) =>
      action.kind === 'in'
        ? start({ data: checkInSchema.parse(action.data) })
        : finish({ data: checkOutSchema.parse(action.data) }),
    retry: false,
    onSettled: () =>
      client.invalidateQueries({ queryKey: attendanceKey(actorId) }),
  })
  async function execute(action: ClockAction) {
    const result = await mutation.mutateAsync(action).catch(() => null)
    if (result?.ok) {
      toast.success(
        action.kind === 'in'
          ? 'სამუშაოს დაწყება დაფიქსირდა.'
          : 'სამუშაოს დასრულება დაფიქსირდა.',
      )
      if (action.kind === 'in') request.current = null
    } else {
      toast.error(
        result
          ? result.message
          : 'მოთხოვნა ვერ დასრულდა. გადაამოწმეთ დასწრების მდგომარეობა ხელახლა ცდამდე.',
      )
    }
    return result?.ok ?? false
  }
  return {
    pending: mutation.isPending,
    start: () => {
      // Retain an operation key across a lost response; retries must not create another working interval.
      if (
        !request.current ||
        request.current.expectedLastSessionId !== overview.lastSessionId
      )
        request.current = {
          requestId: crypto.randomUUID(),
          expectedLastSessionId: overview.lastSessionId,
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
