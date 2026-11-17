import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
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
    defaultValues: { identifier: '', password: '' },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = value.identifier.includes('@')
          ? await authClient.signIn.email({
              email: value.identifier,
              password: value.password,
            })
          : await authClient.signIn.username({
              username: value.identifier.toLowerCase(),
              password: value.password,
            })
        if (result.error) {
          setError(
            result.error.status === 429
              ? 'ძალიან ბევრი მცდელობაა. სცადეთ მოგვიანებით.'
              : 'შესვლა ვერ მოხერხდა. გადაამოწმეთ მომხმარებლის სახელი, პაროლი და ანგარიშის სტატუსი.',
          )
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
            <form.Field name="identifier">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="identifier">
                    მომხმარებლის სახელი ან ელფოსტა
                  </FieldLabel>
                  <Input
                    id="identifier"
                    name={field.name}
                    type="text"
                    className="h-10"
                    placeholder="მომხმარებლის სახელი"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="identifier-error"
                  />
                  <FieldError
                    id="identifier-error"
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
          პირველი შესვლა?{' '}
          <Link
            to="/auth/register"
            className="font-medium text-foreground underline underline-offset-4"
          >
            ანგარიშის გააქტიურება
          </Link>
        </p>
        {/* <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <IconLock className="size-3.5" aria-hidden="true" />
          ანგარიშს ქმნის კომპანიის ადმინისტრატორი.
        </p> */}
      </CardFooter>
    </Card>
  )
}
