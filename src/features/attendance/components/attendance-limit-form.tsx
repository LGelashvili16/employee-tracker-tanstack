import type { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { updateAttendanceLimit } from '../attendance.functions'
import { attendanceLimitSchema } from '../attendance.schemas'

export function AttendanceLimitForm({
  setting,
}: {
  setting: { maxOpenHours: number; revision: number }
}) {
  const call = useServerFn(updateAttendanceLimit)
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof attendanceLimitSchema>) => call({ data }),
    retry: false,
  })
  const form = useForm({
    defaultValues: {
      maxOpenHours: setting.maxOpenHours,
      revision: setting.revision,
      reason: '',
    },
    validators: { onSubmit: attendanceLimitSchema },
    onSubmit: async ({ value }) => {
      const result = await mutation.mutateAsync(value).catch(() => null)
      if (!result?.ok) {
        toast.error(result?.message ?? 'პარამეტრი ვერ შეინახა.')
        return
      }
      toast.success('გადამოწმების ზღვარი შენახულია.')
      await client.invalidateQueries({ queryKey: ['attendance-configuration'] })
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
          ზღვარი მოქმედებს ახალ სესიებზე. საათების გადაჭარბება მხოლოდ
          გაფრთხილებას აჩვენებს, დროის აღრიცხვას არ წყვეტს და გასვლას არ
          აფიქსირებს.
        </p>
        <form.Field name="maxOpenHours">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor="attendance-limit">
                გადამოწმების ზღვარი საათებში
              </FieldLabel>
              <Input
                id="attendance-limit"
                type="number"
                value={field.state.value}
                onChange={(event) =>
                  field.handleChange(event.target.valueAsNumber)
                }
                onBlur={field.handleBlur}
                aria-invalid={!field.state.meta.isValid}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="reason">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor="attendance-limit-reason">
                ცვლილების მიზეზი
              </FieldLabel>
              <Input
                id="attendance-limit-reason"
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
            <Button
              className="relative h-11 px-10"
              disabled={pending}
              aria-busy={pending}
              type="submit"
            >
              {pending ? (
                <Spinner className="absolute left-4" aria-hidden="true" />
              ) : null}
              ზღვრის შენახვა
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}
