import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { authClient } from '#/lib/auth/auth-client'
import { loginSchema } from '../auth.schemas'
import { authContent } from '../auth.content'

export function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = await authClient.signIn.email(value)
        if (result.error) {
          setError('შესვლა ვერ მოხერხდა. გადაამოწმეთ ელფოსტა და პაროლი.')
          return
        }
        router.clearCache()
        await router.invalidate()
        await router.navigate({ to: '/dashboard' })
      } catch {
        setError('სერვერთან დაკავშირება ვერ მოხერხდა. სცადეთ მოგვიანებით.')
      }
    },
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>{authContent.login.title}</h1>
        </CardTitle>
        <CardDescription>{authContent.login.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field name="email">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="email">ელფოსტა</FieldLabel>
                  <Input
                    id="email"
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="email-error"
                  />
                  <FieldError
                    id="email-error"
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="password">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="password">პაროლი</FieldLabel>
                  <Input
                    id="password"
                    name={field.name}
                    type="password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="password-error"
                  />
                  <FieldError
                    id="password-error"
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(submitting) => (
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'მიმდინარეობს შესვლა…' : 'შესვლა'}
                </Button>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
