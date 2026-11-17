import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import type { z } from 'zod'
import { IconLogin2, IconLogout2 } from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '#/components/ui/card'
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldDescription,
} from '#/components/ui/field'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
import { Spinner } from '#/components/ui/spinner'
import { AttendanceDateTimeField } from './attendance-date-time-field'
import { manualAttendanceSchema } from '../attendance.schemas'
import { recordManualAttendance } from '../attendance.functions'
import { formatAttendanceLocalInput } from '../attendance.rules'

export function ManualAttendanceForm({
  userId,
  employeeName,
  timezone,
  serverNow,
  onPending,
  close,
}: {
  userId: string
  employeeName: string
  timezone: string
  serverNow: string
  onPending: (busy: boolean) => void
  close: () => void
}) {
  const call = useServerFn(recordManualAttendance)
  const client = useQueryClient()
  const [requestId] = useState(() => crypto.randomUUID())
  const [error, setError] = useState('')
  const initial = formatAttendanceLocalInput(serverNow, timezone)
  const defaultValues: z.input<typeof manualAttendanceSchema> = {
    userId,
    requestId,
    start: initial,
    includeEnd: false,
    end: '',
    reason: '',
  }
  const form = useForm({
    defaultValues,
    validators: {
      onChange: manualAttendanceSchema,
      onSubmit: manualAttendanceSchema,
    },
    onSubmit: async ({ value }) => {
      onPending(true)
      try {
        const result = await call({ data: manualAttendanceSchema.parse(value) })
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        toast.success('დასწრების ჩანაწერი შენახულია.')
        await Promise.all(
          [
            'company-attendance-user',
            'company-attendance-users',
            'company-timesheets',
            'attendance',
          ].map((key) => client.invalidateQueries({ queryKey: [key] })),
        )
        close()
      } catch {
        const message =
          'დასწრება ვერ შეინახა. გადაამოწმეთ დრო და სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      } finally {
        onPending(false)
      }
    },
  })
  const pending = useStore(form.store, (state) => state.isSubmitting)
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
          <CardTitle>{employeeName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            დასწრების ახალი ჩანაწერი
          </p>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2 font-medium">
                <IconLogin2
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                შესვლა
              </div>
              <form.Field name="start">
                {(field) => (
                  <AttendanceDateTimeField
                    id="manual-start"
                    label="შესვლის დრო"
                    dateLabel="შესვლის თარიღი"
                    value={field.state.value}
                    workDate="2000-01-01"
                    fixedDate={false}
                    disabled={pending}
                    invalid={!field.state.meta.isValid}
                    errors={field.state.meta.errors}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <form.Field name="includeEnd">
                {(field) => (
                  <Field orientation="horizontal">
                    <div className="flex-1">
                      <FieldLabel htmlFor="manual-include-end">
                        <IconLogout2
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        გასვლის დამატება
                      </FieldLabel>
                      <FieldDescription>
                        გამორთვისას ჩანაწერი მიმდინარე დარჩება.
                      </FieldDescription>
                    </div>
                    <Switch
                      id="manual-include-end"
                      checked={field.state.value}
                      onCheckedChange={(checked) => {
                        field.handleChange(checked)
                        if (checked && !form.state.values.end)
                          form.setFieldValue('end', initial)
                      }}
                      disabled={pending}
                    />
                  </Field>
                )}
              </form.Field>
              <form.Subscribe
                selector={(state) => ({
                  includeEnd: state.values.includeEnd,
                  start: state.values.start,
                  busy: state.isSubmitting,
                })}
              >
                {({ includeEnd, start, busy }) =>
                  includeEnd ? (
                    <div className="mt-4 border-t pt-4">
                      <form.Field name="end">
                        {(field) => (
                          <AttendanceDateTimeField
                            id="manual-end"
                            label="გასვლის დრო"
                            dateLabel="გასვლის თარიღი"
                            value={field.state.value}
                            workDate={start.slice(0, 10)}
                            fixedDate={false}
                            disabled={busy}
                            invalid={!field.state.meta.isValid}
                            errors={field.state.meta.errors}
                            onChange={field.handleChange}
                            onBlur={field.handleBlur}
                          />
                        )}
                      </form.Field>
                    </div>
                  ) : null
                }
              </form.Subscribe>
            </div>
            <form.Field name="reason">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="manual-reason">შენიშვნა</FieldLabel>
                  <Textarea
                    id="manual-reason"
                    aria-describedby="manual-reason-error"
                    value={field.state.value ?? ''}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={!field.state.meta.isValid}
                    disabled={pending}
                  />
                  <FieldError
                    id="manual-reason-error"
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(busy) => (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={close}
                >
                  გაუქმება
                </Button>
                <Button type="submit" disabled={busy} aria-busy={busy}>
                  {busy ? <Spinner aria-hidden="true" /> : null}ჩანაწერის
                  შენახვა
                </Button>
              </>
            )}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  )
}
