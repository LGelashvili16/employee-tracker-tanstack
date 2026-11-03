import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { IconEye, IconEyeOff, IconLock } from '@tabler/icons-react'
import { Spinner } from '#/components/ui/spinner'
import { Link, useRouter } from '@tanstack/react-router'
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
  CardFooter,
  CardTitle,
} from '#/components/ui/card'
import { authClient } from '#/lib/auth/auth-client'
import { loginSchema } from '../auth.schemas'
import { authContent } from '../auth.content'

export function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <Card className="w-full shadow-sm">
      <CardHeader className="gap-3 pb-7">
        <CardTitle>
          <h1 className="text-3xl font-semibold tracking-tight">
            {authContent.login.title}
          </h1>
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
                    className="h-10"
                    placeholder="თქვენი ელფოსტა"
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
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel htmlFor="password">პაროლი</FieldLabel>
                    <Link
                      to="/auth/forgot-password"
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      დაგავიწყდათ პაროლი?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      className="h-10 pr-11"
                      id="password"
                      name={field.name}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={!field.state.meta.isValid}
                      aria-describedby="password-error"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 size-8"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? 'პაროლის დამალვა' : 'პაროლის ჩვენება'
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <IconEyeOff aria-hidden="true" />
                      ) : (
                        <IconEye aria-hidden="true" />
                      )}
                    </Button>
                  </div>
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
                <Button
                  type="submit"
                  className="h-10 w-full"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting && <Spinner aria-hidden="true" />}
                  {submitting ? 'მიმდინარეობს შესვლა…' : 'შესვლა'}
                </Button>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3 py-5">
        <p className="text-sm text-muted-foreground">
          ჯერ არ გაქვთ ანგარიში?{' '}
          <Link
            to="/auth/register"
            className="font-medium text-foreground underline underline-offset-4"
          >
            რეგისტრაცია
          </Link>
        </p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <IconLock className="size-3.5" aria-hidden="true" />
          ანგარიშის შექმნა შესაძლებელია კომპანიის მოწვევით.
        </p>
      </CardFooter>
    </Card>
  )
}
