import type { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Textarea } from '#/components/ui/textarea'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Spinner } from '#/components/ui/spinner'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { decideAttendance } from '../attendance.functions'
import { attendanceReviewSchema } from '../attendance.schemas'
import type { ReviewSession } from '../attendance.types'

export function AttendanceReviewForm({
  session,
  close,
  onPending,
}: {
  session: ReviewSession
  close: () => void
  onPending: (pending: boolean) => void
}) {
  const call = useServerFn(decideAttendance)
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof attendanceReviewSchema>) =>
      call({ data }),
    retry: false,
  })
  const form = useForm({
    defaultValues: {
      sessionId: session.id,
      revision: session.revision,
      reason: '',
      decision: 'approve' as 'approve' | 'reject',
      approveOutside: false,
    },
    validators: { onSubmit: attendanceReviewSchema },
    onSubmit: async ({ value }) => {
      onPending(true)
      const result = await mutation.mutateAsync(value).catch(() => null)
      onPending(false)
      if (!result?.ok) {
        toast.error(
          result?.message ??
            'გადაწყვეტილება ვერ შეინახა. განაახლეთ მონაცემები.',
        )
        return
      }
      toast.success('დასწრების განხილვა შენახულია.')
      close()
      await client.invalidateQueries({ queryKey: ['team-attendance'] })
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
          დასწრების დადასტურება ადასტურებს დროის სისწორეს. განრიგს გარეთ
          აღრიცხული დროის ზეგანაკვეთურად დამტკიცება ცალკე არჩევანია. შესვენება
          ავტომატურად არ აკლდება.
        </p>
        <form.Field name="decision">
          {(field) => (
            <Field>
              <FieldLabel>გადაწყვეტილება</FieldLabel>
              <RadioGroup
                aria-label="გადაწყვეტილება"
                value={field.state.value}
                onValueChange={(value) => {
                  if (value === 'approve' || value === 'reject')
                    field.handleChange(value)
                }}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    id={`approve-${session.id}`}
                    value="approve"
                  />
                  <FieldLabel htmlFor={`approve-${session.id}`}>
                    დადასტურება
                  </FieldLabel>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id={`reject-${session.id}`} value="reject" />
                  <FieldLabel htmlFor={`reject-${session.id}`}>
                    უარყოფა
                  </FieldLabel>
                </div>
              </RadioGroup>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="approveOutside">
          {(field) => (
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`outside-${session.id}`}
                  checked={field.state.value}
                  onCheckedChange={(value) =>
                    field.handleChange(value === true)
                  }
                />
                <FieldLabel htmlFor={`outside-${session.id}`}>
                  განრიგს გარეთ აღრიცხული დროის ზეგანაკვეთურად დამტკიცება
                </FieldLabel>
              </div>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="reason">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor={`review-reason-${session.id}`}>
                გადაწყვეტილების მიზეზი
              </FieldLabel>
              <Textarea
                id={`review-reason-${session.id}`}
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
            <div className="flex flex-wrap gap-2">
              <Button
                className="relative h-11 min-w-52 px-10"
                type="submit"
                disabled={
                  pending ||
                  !session.endedAt ||
                  session.reviewState !== 'pending'
                }
                aria-busy={pending}
              >
                {pending ? (
                  <Spinner className="absolute left-4" aria-hidden="true" />
                ) : null}
                გადაწყვეტილების შენახვა
              </Button>
            </div>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}
