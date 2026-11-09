import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { Spinner } from '#/components/ui/spinner'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { reviewLeaveSchema, reviewLeaveFormSchema } from '../leave.schemas'
import type { ReviewLeaveInput } from '../leave.schemas'
import type { LeaveItem } from '../leave.types'
import { decideLeave } from '../leave.functions'
import { leaveKey } from '../leave.queries'
import { dayOffAllowanceKey } from '../day-off-allowance.queries'
import { kindLabels } from '../leave.presentation'
import { LeaveDateInput } from './leave-date-input'
import { LeaveSelect } from './leave-select'

const actions = [
  { value: 'approved', label: 'დამტკიცება' },
  { value: 'rejected', label: 'უარყოფა' },
  { value: 'modified', label: 'მხოლოდ თარიღების შეცვლა' },
]
export function LeaveReviewForm({
  item,
  onSaved,
}: {
  item: LeaveItem
  onSaved: () => void
}) {
  const save = useServerFn(decideLeave)
  const client = useQueryClient()
  const [error, setError] = useState('')
  const defaultValues: ReviewLeaveInput = {
    id: item.id,
    revision: item.revision,
    startDate: item.startDate,
    endDate: item.kind === 'day_off' ? item.startDate : item.endDate,
    reason: '',
    action: 'approved',
  }
  const form = useForm({
    defaultValues,
    validators: { onSubmit: reviewLeaveFormSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = await save({ data: value })
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          void client.invalidateQueries({ queryKey: leaveKey })
          return
        }
      } catch {
        const message =
          'განხილვა ვერ დასრულდა. განაახლეთ სია და სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
        return
      }
      toast.success(
        value.action === 'modified'
          ? 'თარიღები შეცვლილია. მოთხოვნა კვლავ მოლოდინშია.'
          : value.action === 'approved'
            ? 'მოთხოვნა დამტკიცებულია.'
            : 'მოთხოვნა უარყოფილია.',
      )
      void client.invalidateQueries({ queryKey: leaveKey })
      void client.invalidateQueries({ queryKey: dayOffAllowanceKey })
      onSaved()
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
          <FieldGroup>
            <p className="break-words text-sm font-medium">
              {item.name} · {kindLabels[item.kind]}
            </p>
            {item.note ? (
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {item.note}
              </p>
            ) : null}
            <div
              className={
                item.kind === 'day_off'
                  ? 'grid gap-4'
                  : 'grid gap-4 sm:grid-cols-2'
              }
            >
              {(item.kind === 'day_off' ||
              (item.kind === 'sick_leave' && item.endDate === null)
                ? (['startDate'] as const)
                : (['startDate', 'endDate'] as const)
              ).map((name) => (
                <form.Field key={name} name={name}>
                  {(field) => (
                    <Field data-invalid={!field.state.meta.isValid}>
                      <FieldLabel htmlFor={`review-${name}`}>
                        {item.kind === 'day_off'
                          ? 'თარიღი'
                          : name === 'startDate'
                            ? 'დაწყება'
                            : 'დასრულება'}{' '}
                        <span aria-hidden="true">*</span>
                      </FieldLabel>
                      <LeaveDateInput
                        id={`review-${name}`}
                        value={field.state.value ?? ''}
                        disabled={pending}
                        invalid={!field.state.meta.isValid}
                        onChange={(value) => {
                          field.handleChange(value)
                          if (item.kind === 'day_off')
                            form.setFieldValue('endDate', value)
                        }}
                        onBlur={field.handleBlur}
                      />
                      <FieldError
                        id={`review-${name}-error`}
                        errors={field.state.meta.errors}
                      />
                    </Field>
                  )}
                </form.Field>
              ))}
            </div>
            <form.Field name="action">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="review-action">
                    მოქმედება <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <LeaveSelect
                    id="review-action"
                    required
                    value={field.state.value}
                    items={actions}
                    disabled={pending}
                    invalid={!field.state.meta.isValid}
                    onBlur={field.handleBlur}
                    onChange={(value) => {
                      const parsed =
                        reviewLeaveSchema.shape.action.safeParse(value)
                      if (parsed.success) field.handleChange(parsed.data)
                    }}
                  />
                  <FieldError
                    id="review-action-error"
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="reason">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="review-reason">აღწერა</FieldLabel>
                  <Textarea
                    id="review-reason"
                    value={field.state.value}
                    disabled={pending}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="review-reason-error"
                  />
                  <FieldError
                    id="review-reason-error"
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
            <form.Subscribe selector={(state) => state.errors}>
              {(errors) =>
                errors.length ? (
                  <p role="alert" className="text-sm text-destructive">
                    გადაამოწმეთ განხილვის ველები.
                  </p>
                ) : null
              }
            </form.Subscribe>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? <Spinner aria-hidden="true" /> : null}განხილვის შენახვა
            </Button>
          </FieldGroup>
        )}
      </form.Subscribe>
    </form>
  )
}
