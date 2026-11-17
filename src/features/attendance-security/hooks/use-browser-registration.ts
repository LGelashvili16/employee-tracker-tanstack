import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { requestAttendanceDevice } from '../attendance-security.functions'

class BrowserRegistrationError extends Error {}

export function useBrowserRegistration(actorId: string, name?: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const result = await requestAttendanceDevice({
        data: { name: name ?? 'დასწრების ბრაუზერი' },
      })
      if (!result.ok) throw new BrowserRegistrationError(result.message)
    },
    onSuccess: () => toast.success('მოწყობილობის მოთხოვნა გაგზავნილია.'),
    onError: (error) =>
      toast.error(
        error instanceof BrowserRegistrationError
          ? error.message
          : 'აქტივაცია ვერ დასრულდა. სცადეთ მოგვიანებით ან დაუკავშირდით HR-ს.',
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
