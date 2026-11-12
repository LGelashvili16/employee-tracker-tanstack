import type { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
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
import { AttendanceDateTimeField } from './attendance-date-time-field'

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
      <Card>
        <CardHeader>
          <CardTitle>{session.employeeName}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {(['start', 'end'] as const).map((name) => (
              <form.Field key={name} name={name}>
                {(field) => (
                  <AttendanceDateTimeField
                    id={`${name}-${session.id}`}
                    label={name === 'start' ? 'დაწყება' : 'დასრულება'}
                    dateLabel={
                      name === 'start' ? 'დაწყების თარიღი' : 'დასრულების თარიღი'
                    }
                    workDate={session.workDate}
                    fixedDate={name === 'start'}
                    disabled={mutation.isPending}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    invalid={!field.state.meta.isValid}
                    errors={field.state.meta.errors}
                  />
                )}
              </form.Field>
            ))}
            <form.Field name="reason">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor={`correction-reason-${session.id}`}>
                    შესწორების მიზეზი <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <Textarea
                    id={`correction-reason-${session.id}`}
                    required
                    disabled={mutation.isPending}
                    aria-describedby={`correction-reason-${session.id}-error`}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={!field.state.meta.isValid}
                  />
                  <FieldError
                    id={`correction-reason-${session.id}-error`}
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(pending) => (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={pending}
                >
                  გაუქმება
                </Button>
                <Button type="submit" disabled={pending} aria-busy={pending}>
                  {pending ? (
                    <Spinner className="absolute left-4" aria-hidden="true" />
                  ) : null}
                  შესწორების შენახვა
                </Button>
              </>
            )}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  )
}
