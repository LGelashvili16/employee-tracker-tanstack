import type { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { IconInfoCircle } from '@tabler/icons-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
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
        <form.Field name="maxOpenHours">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor="attendance-limit">
                გადამოწმების ზღვარი (საათი)
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </FieldLabel>
              <Input
                id="attendance-limit"
                type="number"
                required
                min={8}
                max={72}
                aria-describedby="attendance-limit-info attendance-limit-error"
                value={Number.isNaN(field.state.value) ? '' : field.state.value}
                onChange={(event) =>
                  field.handleChange(event.target.valueAsNumber)
                }
                onBlur={field.handleBlur}
                aria-invalid={!field.state.meta.isValid}
              />
              <FieldError
                id="attendance-limit-error"
                errors={field.state.meta.errors}
              />
            </Field>
          )}
        </form.Field>
        <Alert variant="info" role="note" id="attendance-limit-info">
          <IconInfoCircle aria-hidden="true" />
          <AlertDescription>
            თანამშრომელს შეუძლია მუშაობა ნებისმიერ დროს დაასრულოს. თუ სესია ღია
            დარჩა, ის 18 საათის შემდეგ ავტომატურად დასრულდება. გადამოწმების
            ზღვარი გაფრთხილებისთვისაა.
          </AlertDescription>
        </Alert>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(pending) => (
            <Button
              className="relative min-w-40 self-end px-8"
              depth="raised"
              disabled={pending}
              aria-busy={pending}
              type="submit"
            >
              {pending ? (
                <Spinner className="absolute left-3" aria-hidden="true" />
              ) : null}
              ზღვრის შენახვა
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}
