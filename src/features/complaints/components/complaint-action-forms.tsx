import { useState } from 'react'
import { IconCheck, IconSend } from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
import { useServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { notificationKeys } from '#/features/notifications/notifications.queries'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Spinner } from '#/components/ui/spinner'
import { AppSelect } from '#/components/common/app-select'
import { decideComplaint, sendComplaintReply } from '../complaints.functions'
import {
  complaintReplySchema,
  complaintStatusChangeSchema,
  complaintStatusSchema,
} from '../complaints.schemas'
import { complaintKeys } from '../complaints.queries'
import type { ComplaintDetail } from '../complaints.queries'
import { canChangeComplaintStatus } from '../complaints.rules'
import { complaintStatusLabels } from '../complaints.presentation'

export function ComplaintReplyForm({
  item,
  actorId,
}: {
  item: ComplaintDetail
  actorId: string
}) {
  const send = useServerFn(sendComplaintReply)
  const client = useQueryClient()
  const [error, setError] = useState('')
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID())
  const form = useForm({
    defaultValues: { body: '' },
    validators: { onSubmit: complaintReplySchema.pick({ body: true }) },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = await send({
          data: { id: item.id, submissionId, body: value.body },
        })
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        toast.success('პასუხი გაგზავნილია.')
        form.reset()
        void client.invalidateQueries({
          queryKey: notificationKeys.own(actorId),
        })
        setSubmissionId(crypto.randomUUID())
        void client.invalidateQueries({ queryKey: complaintKeys.all(actorId) })
      } catch {
        const message = 'პასუხი ვერ გაიგზავნა. სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      }
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
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => (
          <FieldGroup className="gap-4">
            <form.Field name="body">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="complaint-reply">
                    კომენტარი <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <Textarea
                    id="complaint-reply"
                    rows={4}
                    required
                    maxLength={5000}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    disabled={pending}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="complaint-reply-error"
                  />
                  <FieldError
                    id="complaint-reply-error"
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button
              type="submit"
              className="self-end w-full sm:w-auto"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              ) : (
                <IconSend data-icon="inline-start" aria-hidden="true" />
              )}
              კომენტარის დამატება
            </Button>
          </FieldGroup>
        )}
      </form.Subscribe>
    </form>
  )
}

export function ComplaintReviewForm({
  item,
  actorId,
}: {
  item: ComplaintDetail
  actorId: string
}) {
  const decide = useServerFn(decideComplaint)
  const reply = useServerFn(sendComplaintReply)
  const client = useQueryClient()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(item.revision)
  const [submissionId, setSubmissionId] = useState<string>(() =>
    crypto.randomUUID(),
  )
  const active = item.status === 'new' || item.status === 'in_review'
  const choices = complaintStatusSchema.options.filter(
    (status) =>
      (active && status === item.status) ||
      canChangeComplaintStatus(item.status, status),
  )
  const form = useForm({
    defaultValues: {
      status: active ? item.status : ('in_review' as const),
      reason: '',
    },
    validators: {
      onSubmit: complaintStatusChangeSchema.pick({
        status: true,
        reason: true,
      }),
    },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result =
          value.status === item.status
            ? await reply({
                data: { id: item.id, submissionId, body: value.reason },
              })
            : await decide({
                data: {
                  id: item.id,
                  revision,
                  status: value.status,
                  reason: value.reason,
                },
              })
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          void client.invalidateQueries({
            queryKey: complaintKeys.all(actorId),
          })
          return
        }
        toast.success('საჩივარი განახლებულია.')
        setRevision(revision + 1)
        setSubmissionId(crypto.randomUUID())
        form.reset()
        void client.invalidateQueries({
          queryKey: notificationKeys.own(actorId),
        })
        void client.invalidateQueries({ queryKey: complaintKeys.all(actorId) })
      } catch {
        const message = 'ცვლილება ვერ შეინახა. სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      }
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
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => (
          <FieldGroup className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FieldLabel htmlFor="complaint-status-change">სტატუსი</FieldLabel>
              <form.Field name="status">
                {(field) => (
                  <Field
                    className="w-full sm:w-48"
                    data-invalid={!field.state.meta.isValid}
                  >
                    <AppSelect
                      id="complaint-status-change"
                      required
                      value={field.state.value}
                      disabled={pending}
                      onBlur={field.handleBlur}
                      invalid={!field.state.meta.isValid}
                      onChange={(value) => {
                        const parsed = complaintStatusSchema.safeParse(value)
                        if (parsed.success) field.handleChange(parsed.data)
                      }}
                      items={choices.map((value) => ({
                        value,
                        label: complaintStatusLabels[value],
                      }))}
                    />
                    <FieldError
                      id="complaint-status-change-error"
                      errors={field.state.meta.errors}
                    />
                  </Field>
                )}
              </form.Field>
            </div>
            {/* Own saves can reach SSE and the mutation response in either order. */}
            {!pending && item.revision > revision ? (
              <Alert variant="warning">
                <AlertDescription>
                  საჩივარი შეიცვალა. გადაამოწმეთ ახალი მონაცემები შენახვამდე.
                </AlertDescription>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRevision(item.revision)
                    form.setFieldValue(
                      'status',
                      active ? item.status : 'in_review',
                    )
                    setError('')
                  }}
                >
                  განხილვის განახლება
                </Button>
              </Alert>
            ) : null}
            <form.Field name="reason">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="complaint-reason">
                    კომენტარი <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <Textarea
                    id="complaint-reason"
                    required
                    rows={4}
                    maxLength={2000}
                    placeholder="დაწერეთ პასუხი ან განხილვის შედეგი"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    disabled={pending}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="complaint-reason-error"
                  />
                  <FieldError
                    id="complaint-reason-error"
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={pending || revision !== item.revision}
                aria-busy={pending}
              >
                {pending ? (
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <IconCheck data-icon="inline-start" aria-hidden="true" />
                )}
                შენახვა
              </Button>
            </div>
          </FieldGroup>
        )}
      </form.Subscribe>
    </form>
  )
}
