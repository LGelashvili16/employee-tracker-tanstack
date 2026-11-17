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
import { createLeaveSchema, leaveKindSchema } from '../leave.schemas'
import type { CreateLeaveInput } from '../leave.schemas'
import { submitLeave } from '../leave.functions'
import { leaveKey } from '../leave.queries'
import { kindLabels } from '../leave.presentation'
import { LeaveDateInput } from './leave-date-input'
import { LeaveSelect } from './leave-select'

export function LeaveRequestForm({ onSaved }: { onSaved: () => void }) {
  const save = useServerFn(submitLeave)
  const client = useQueryClient()
  const [error, setError] = useState('')
  const defaultValues: CreateLeaveInput = {
    kind: 'day_off',
    startDate: '',
    endDate: '',
    note: '',
  }
  const form = useForm({
    defaultValues,
    validators: { onSubmit: createLeaveSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = await save({ data: value })
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
      } catch {
        const message =
          'მოთხოვნა ვერ გაიგზავნა. გადაამოწმეთ სია ხელახლა გაგზავნამდე.'
        setError(message)
        toast.error(message)
        return
      }
      toast.success('მოთხოვნა გაგზავნილია.')
      void client.invalidateQueries({ queryKey: leaveKey })
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
            <form.Field name="kind">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="leave-kind">
                    მოთხოვნის ტიპი <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <LeaveSelect
                    id="leave-kind"
                    required
                    value={field.state.value}
                    items={Object.entries(kindLabels).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    disabled={pending}
                    invalid={!field.state.meta.isValid}
                    onBlur={field.handleBlur}
                    onChange={(value) => {
                      const parsed = leaveKindSchema.safeParse(value)
                      if (parsed.success) {
                        field.handleChange(parsed.data)
                        if (parsed.data === 'sick_leave')
                          form.setFieldValue('endDate', null)
                        else if (
                          parsed.data === 'vacation' &&
                          form.getFieldValue('endDate') === null
                        )
                          form.setFieldValue('endDate', '')
                        else if (parsed.data === 'day_off')
                          form.setFieldValue(
                            'endDate',
                            form.getFieldValue('startDate'),
                          )
                      }
                    }}
                  />
                  <FieldError
                    id="leave-kind-error"
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
            <form.Subscribe selector={(state) => state.values.kind}>
              {(kind) => (
                <div
                  className={
                    kind !== 'vacation'
                      ? 'grid gap-4'
                      : 'grid gap-4 sm:grid-cols-2'
                  }
                >
                  {(kind === 'day_off' || kind === 'sick_leave'
                    ? (['startDate'] as const)
                    : (['startDate', 'endDate'] as const)
                  ).map((name) => (
                    <form.Field key={name} name={name}>
                      {(field) => (
                        <Field data-invalid={!field.state.meta.isValid}>
                          <FieldLabel htmlFor={`leave-${name}`}>
                            {kind === 'day_off'
                              ? 'თარიღი'
                              : name === 'startDate'
                                ? 'დაწყება'
                                : 'დასრულება'}{' '}
                            <span aria-hidden="true">*</span>
                          </FieldLabel>
                          <LeaveDateInput
                            id={`leave-${name}`}
                            value={field.state.value ?? ''}
                            disabled={pending}
                            invalid={!field.state.meta.isValid}
                            onChange={(value) => {
                              field.handleChange(value)
                              if (kind === 'day_off')
                                form.setFieldValue('endDate', value)
                            }}
                            onBlur={field.handleBlur}
                          />
                          <FieldError
                            id={`leave-${name}-error`}
                            errors={field.state.meta.errors}
                          />
                        </Field>
                      )}
                    </form.Field>
                  ))}
                </div>
              )}
            </form.Subscribe>
            <form.Subscribe selector={(state) => state.values.kind}>
              {(kind) =>
                kind === 'sick_leave' ? (
                  <Alert variant="info" role="status">
                    <AlertDescription>
                      დროებითი შრომისუუნარობა. დასრულების თარიღს მოგვიანებით
                      დააფიქსირებთ. დიაგნოზის მითითება საჭირო არ არის.
                    </AlertDescription>
                  </Alert>
                ) : null
              }
            </form.Subscribe>
            <form.Field name="note">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="leave-note">კომენტარი</FieldLabel>
                  <Textarea
                    id="leave-note"
                    value={field.state.value}
                    disabled={pending}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="leave-note-error"
                  />
                  <FieldError
                    id="leave-note-error"
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
                    გადაამოწმეთ მოთხოვნის ველები.
                  </p>
                ) : null
              }
            </form.Subscribe>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? <Spinner aria-hidden="true" /> : null}მოთხოვნის
              გაგზავნა
            </Button>
          </FieldGroup>
        )}
      </form.Subscribe>
    </form>
  )
}
