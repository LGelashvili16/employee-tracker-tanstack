import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  registerAttendancePasskey,
  requestAttendanceDevice,
  verifyAttendanceRegistration,
} from '../attendance-security.functions'
import { registrationProofSchema } from '../attendance-security.schemas'

class PasskeyEnrollmentError extends Error {}

export function usePasskeyEnrollment(
  actorId: string,
  device: { name: string; state: string; hasPasskey: boolean } | null,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (
        !device ||
        ['unrequested', 'rejected', 'revoked'].includes(device.state)
      ) {
        const requested = await requestAttendanceDevice({
          data: { name: device?.name ?? 'დასწრების ბრაუზერი' },
        })
        if (!requested.ok) throw new PasskeyEnrollmentError(requested.message)
      }
      // Revocation retains the credential. Reapply for review without duplicating it.
      if (device?.hasPasskey) return 'review_requested'
      const start = await registerAttendancePasskey()
      if (!start.ok) throw new PasskeyEnrollmentError(start.message)
      const { startRegistration } = await import('@simplewebauthn/browser')
      const response = await startRegistration({
        optionsJSON: start.value.options,
      })
      const result = await verifyAttendanceRegistration({
        data: registrationProofSchema.parse({
          challengeId: start.value.challengeId,
          response,
        }),
      })
      if (!result.ok) throw new PasskeyEnrollmentError(result.message)
      return 'enrolled'
    },
    onSuccess: (outcome) =>
      toast.success(
        outcome === 'review_requested'
          ? 'მოთხოვნა გაგზავნილია. დაელოდეთ HR-ის დადასტურებას.'
          : 'Passkey დამატებულია. დაელოდეთ HR-ის დადასტურებას.',
      ),
    onError: (error) =>
      toast.error(
        error instanceof PasskeyEnrollmentError
          ? error.message
          : 'Passkey ვერ დაემატა. სცადეთ ხელახლა ან დაუკავშირდით HR-ს.',
      ),
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({
          queryKey: ['attendance-security', 'own', actorId],
        }),
        client.invalidateQueries({
          queryKey: ['attendance-security', 'status', actorId],
        }),
      ]),
    retry: false,
  })
}
