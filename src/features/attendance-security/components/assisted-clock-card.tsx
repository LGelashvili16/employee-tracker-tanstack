import { assistedClockOptions } from '../attendance-security.queries'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Textarea } from '#/components/ui/textarea'
import { Checkbox } from '#/components/ui/checkbox'
import {
  startMyWork,
  finishMyWork,
} from '#/features/attendance/attendance.functions'
import { securityReasonSchema } from '../attendance-security.schemas'
import { ClockVerificationError, verifyClockIntent } from '../verify-clock'
import { SecuritySubmit } from './security-controls'

const schema = z.object({
  reason: securityReasonSchema,
  confirmed: z
    .boolean()
    .refine((value) => value, 'დაადასტურეთ თანამშრომლის ნაცვლად მოქმედება.'),
})
export function AssistedClockCard({
  actorId,
  userId,
}: {
  actorId: string
  userId: string
}) {
  const query = useQuery(assistedClockOptions(actorId, userId))
  const state = query.data?.ok ? query.data.value : null
  const client = useQueryClient()
  const [error, setError] = useState('')
  const request = useRef<{ last: string | null; id: string } | null>(null)
  const form = useForm({
    defaultValues: { reason: '', confirmed: false },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      if (!state) return
      if (!request.current || request.current.last !== state.lastSessionId)
        request.current = { last: state.lastSessionId, id: crypto.randomUUID() }
      try {
        const proof = await verifyClockIntent(
          state.openSessionId
            ? {
                kind: 'out',
                targetUserId: userId,
                reason: value.reason,
                data: { sessionId: state.openSessionId, confirmEarly: true },
              }
            : {
                kind: 'in',
                targetUserId: userId,
                reason: value.reason,
                data: {
                  requestId: request.current.id,
                  expectedLastSessionId: state.lastSessionId,
                  confirmedNonWorkingDate: state.nonWorking
                    ? state.workDate
                    : undefined,
                },
              },
        )
        const result = await (proof.intent.kind === 'in'
          ? startMyWork({ data: proof })
          : finishMyWork({ data: proof }))
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        toast.success('თანამშრომლის დასწრება აღრიცხულია.')
        setError('')
        form.reset()
      } catch (failure) {
        const message =
          failure instanceof ClockVerificationError
            ? failure.message
            : 'დასწრება ვერ აღირიცხა. გადაამოწმეთ მდგომარეობა ხელახლა ცდამდე.'
        setError(message)
        toast.error(message)
      } finally {
        await Promise.all([
          client.invalidateQueries({
            queryKey: ['attendance-security', 'assisted'],
          }),
          client.invalidateQueries({ queryKey: ['company-attendance-user'] }),
        ])
      }
    },
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>თანამშრომლის ნაცვლად აღრიცხვა</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert variant="warning" role="note">
          <AlertDescription>
            მოქმედება აღირიცხება თქვენი სახელით და მიმდინარე დროით. წარსული
            დროის აღსადგენად გამოიყენეთ დროის შესწორება.
            {state?.nonWorking
              ? ' თანამშრომელს არასამუშაო დღე ან დამტკიცებული არყოფნა აქვს.'
              : ''}
          </AlertDescription>
        </Alert>
        {state ? (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              void form.handleSubmit()
            }}
          >
            <FieldGroup>
              <form.Field name="reason">
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor="assisted-reason">
                      თანამშრომლის ნაცვლად მოქმედების მიზეზი
                    </FieldLabel>
                    <Textarea
                      id="assisted-reason"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      aria-invalid={!field.state.meta.isValid}
                      aria-describedby="assisted-reason-error"
                    />
                    <FieldError
                      id="assisted-reason-error"
                      errors={field.state.meta.errors}
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="confirmed">
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <Field orientation="horizontal">
                      <Checkbox
                        id="assisted-confirmation"
                        checked={field.state.value}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                        aria-invalid={!field.state.meta.isValid}
                        aria-describedby="assisted-confirmation-error"
                      />
                      <FieldLabel htmlFor="assisted-confirmation">
                        ვადასტურებ თანამშრომლის ნაცვლად{' '}
                        {state.openSessionId
                          ? 'მუშაობის დასრულებას, მათ შორის ადრე გასვლას'
                          : 'მუშაობის დაწყებას, მათ შორის არასამუშაო დღეს'}
                        .
                      </FieldLabel>
                    </Field>
                    <FieldError
                      id="assisted-confirmation-error"
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
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(pending) => (
                  <SecuritySubmit pending={pending}>
                    {state.openSessionId
                      ? 'გასვლის აღრიცხვა'
                      : 'შესვლის აღრიცხვა'}
                  </SecuritySubmit>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            {query.isPending
              ? 'დასწრების მდგომარეობა იტვირთება.'
              : 'ამ თანამშრომლის ნაცვლად აღრიცხვა მიუწვდომელია.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
