import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { IconLockPassword } from '@tabler/icons-react'
import { toast } from 'sonner'
import { PasswordInput } from '#/components/common/password-input'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { authClient } from '#/lib/auth/auth-client'
import { changePasswordFormSchema } from '../account.schemas'

const passwordFields = [
  {
    name: 'currentPassword',
    label: 'მიმდინარე პაროლი',
    autoComplete: 'current-password',
  },
  { name: 'newPassword', label: 'ახალი პაროლი', autoComplete: 'new-password' },
  {
    name: 'confirmPassword',
    label: 'ახალი პაროლის გამეორება',
    autoComplete: 'new-password',
  },
] as const

function failureMessage(error: { status: number; code?: string }) {
  if (error.status === 429) return 'ძალიან ბევრი მცდელობაა. სცადეთ მოგვიანებით.'
  if (error.code === 'INVALID_PASSWORD') return 'მიმდინარე პაროლი არასწორია.'
  return 'პაროლი ვერ შეიცვალა. სცადეთ ხელახლა.'
}

export function ChangePasswordForm() {
  const [error, setError] = useState('')
  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validators: { onSubmit: changePasswordFormSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        // Other devices are signed out so a stolen session cannot outlive the new password.
        const result = await authClient.changePassword({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
          revokeOtherSessions: true,
        })
        if (result.error) {
          const message = failureMessage(result.error)
          setError(message)
          toast.error(message)
          return
        }
        form.reset()
        toast.success('პაროლი შეიცვალა. სხვა მოწყობილობებიდან გამოხვედით.')
      } catch {
        const message =
          'სერვერთან დაკავშირება ვერ მოხერხდა. სცადეთ მოგვიანებით.'
        setError(message)
        toast.error(message)
      }
    },
  })

  return (
    <form
      noValidate
      className="max-w-md"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        {passwordFields.map(({ name, label, autoComplete }) => (
          <form.Field key={name} name={name}>
            {(field) => {
              const id = `change-${name}`
              const invalid = !field.state.meta.isValid
              return (
                <Field data-invalid={invalid}>
                  <FieldLabel htmlFor={id}>{label}</FieldLabel>
                  <PasswordInput
                    id={id}
                    name={name}
                    label={label}
                    autoComplete={autoComplete}
                    value={field.state.value}
                    invalid={invalid}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                  />
                  <FieldError
                    id={`${id}-error`}
                    errors={field.state.meta.errors}
                  />
                </Field>
              )
            }}
          </form.Field>
        ))}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(pending) => (
            <Button
              type="submit"
              className="w-full sm:w-fit"
              disabled={pending}
              aria-busy={pending}
            >
              <span className="flex size-4 items-center justify-center">
                {pending ? (
                  <Spinner aria-hidden="true" />
                ) : (
                  <IconLockPassword aria-hidden="true" />
                )}
              </span>
              პაროლის შეცვლა
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}
