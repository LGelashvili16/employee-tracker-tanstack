import { useState } from 'react'
import { IconSend } from '@tabler/icons-react'
import { useForm } from '@tanstack/react-form'
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
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Spinner } from '#/components/ui/spinner'
import { AppSelect } from '#/components/common/app-select'
import { createComplaintSchema } from '../complaints.schemas'
import { submitComplaint } from '../complaints.functions'
import { complaintCategoryLabels } from '../complaints.presentation'

export function ComplaintCreateForm({
  onSaved,
  onPendingChange,
}: {
  onSaved: (id: string) => void
  onPendingChange: (pending: boolean) => void
}) {
  const save = useServerFn(submitComplaint)
  const [submissionId] = useState<string>(() => crypto.randomUUID())
  const [error, setError] = useState('')
  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: 'other',
      submissionId,
    },
    validators: { onSubmit: createComplaintSchema },
    onSubmit: async ({ value }) => {
      setError('')
      onPendingChange(true)
      try {
        const result = await save({ data: createComplaintSchema.parse(value) })
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        toast.success('საჩივარი რეგისტრირებულია.')
        onSaved(result.value.id)
      } catch {
        const message = 'საჩივარი ვერ გაიგზავნა. სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      } finally {
        onPendingChange(false)
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
          <FieldGroup className="gap-5">
            {(['title', 'description'] as const).map((name) => (
              <form.Field key={name} name={name}>
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={`complaint-${name}`}>
                      {name === 'title' ? 'თემა' : 'აღწერა'}{' '}
                      <span aria-hidden="true">*</span>
                    </FieldLabel>
                    {name === 'description' ? (
                      <Textarea
                        id={`complaint-${name}`}
                        required
                        rows={6}
                        maxLength={5000}
                        value={field.state.value}
                        disabled={pending}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={!field.state.meta.isValid}
                        aria-describedby={`complaint-${name}-error`}
                      />
                    ) : (
                      <Input
                        id={`complaint-${name}`}
                        required
                        maxLength={160}
                        value={field.state.value}
                        disabled={pending}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={!field.state.meta.isValid}
                        aria-describedby={`complaint-${name}-error`}
                      />
                    )}
                    <FieldError
                      id={`complaint-${name}-error`}
                      errors={field.state.meta.errors}
                    />
                  </Field>
                )}
              </form.Field>
            ))}
            <form.Field name="category">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="complaint-category">
                    კატეგორია <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <AppSelect
                    id="complaint-category"
                    value={field.state.value}
                    required
                    disabled={pending}
                    invalid={!field.state.meta.isValid}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    items={Object.entries(complaintCategoryLabels).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                  <FieldError
                    id="complaint-category-error"
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
              საჩივრის გაგზავნა
            </Button>
          </FieldGroup>
        )}
      </form.Subscribe>
    </form>
  )
}
