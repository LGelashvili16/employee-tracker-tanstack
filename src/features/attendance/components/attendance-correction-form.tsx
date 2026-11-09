import type { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Spinner } from '#/components/ui/spinner'
import { amendAttendance } from '../attendance.functions'
import { attendanceCorrectionSchema } from '../attendance.schemas'
import { formatAttendanceLocalInput } from '../attendance.rules'
import type { ReviewSession } from '../attendance.types'

export function AttendanceCorrectionForm({
  session,
  close,
  onPending,
}: {
  session: ReviewSession
  close: () => void
  onPending: (pending: boolean) => void
}) {
  const call = useServerFn(amendAttendance)
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof attendanceCorrectionSchema>) =>
      call({ data }),
    retry: false,
  })
  const form = useForm({
    defaultValues: {
      sessionId: session.id,
      revision: session.revision,
      start: formatAttendanceLocalInput(session.startedAt, session.timezone),
      end: session.endedAt
        ? formatAttendanceLocalInput(session.endedAt, session.timezone)
        : '',
      reason: '',
    },
    validators: { onSubmit: attendanceCorrectionSchema },
    onSubmit: async ({ value }) => {
      onPending(true)
      const result = await mutation.mutateAsync(value).catch(() => null)
      onPending(false)
      if (!result?.ok) {
        toast.error(
          result?.message ??
            'დროის შესწორება ვერ შეინახა. განაახლეთ მონაცემები.',
        )
        return
      }
      toast.success('დრო შესწორებულია. ჩანაწერი კვლავ განხილვის მოლოდინშია.')
      close()
      await Promise.all([
        client.invalidateQueries({ queryKey: ['team-attendance'] }),
        client.invalidateQueries({ queryKey: ['company-attendance-user'] }),
        client.invalidateQueries({ queryKey: ['company-attendance-users'] }),
        client.invalidateQueries({ queryKey: ['company-timesheets'] }),
      ])
    },
  })
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          დროის სარტყელი: {session.timezone}. დაწყება უნდა დარჩეს{' '}
          {session.workDate} თარიღზე. თავდაპირველი დრო და ცვლილებების ისტორია
          ინახება. შესწორება აუქმებს წინა დამტკიცებას.
        </p>
        {(['start', 'end'] as const).map((name) => (
          <form.Field key={name} name={name}>
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={`${name}-${session.id}`}>
                  {name === 'start' ? 'დაწყება' : 'დასრულება'}
                </FieldLabel>
                <Input
                  id={`${name}-${session.id}`}
                  type="datetime-local"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={!field.state.meta.isValid}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        ))}
        <form.Field name="reason">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor={`correction-reason-${session.id}`}>
                შესწორების მიზეზი
              </FieldLabel>
              <Textarea
                id={`correction-reason-${session.id}`}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={!field.state.meta.isValid}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(pending) => (
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? (
                <Spinner className="absolute left-4" aria-hidden="true" />
              ) : null}
              შესწორების შენახვა
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}
