import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { IconUserPlus } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Spinner } from '#/components/ui/spinner'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { roleLabels } from '#/lib/authorization/permissions'
import { createEmployeeAccount } from '../access.functions'
import { employeeRoleSchema, provisionAccountSchema } from '../access.schemas'
import { EmployeeScheduleField } from './employee-schedule-field'
import type { z } from 'zod'
import type { IssuedAccountCode } from '../access.types'

const defaults: z.input<typeof provisionAccountSchema> = {
  code: '',
  name: '',
  contactEmail: '',
  role: 'employee',
  jobTitle: '',
  phone: '',
  workingWeek: null,
}
const textFields = [
  {
    name: 'name',
    label: 'სახელი და გვარი',
    required: true,
    autoComplete: 'name',
  },
  {
    name: 'code',
    label: 'მომხმარებლის სახელი',
    required: true,
    autoComplete: 'off',
  },
  {
    name: 'contactEmail',
    label: 'ელფოსტა',
    required: false,
    autoComplete: 'email',
  },
  {
    name: 'jobTitle',
    label: 'თანამდებობა',
    required: false,
    autoComplete: 'organization-title',
  },
  {
    name: 'phone',
    label: 'ტელეფონის ნომერი',
    required: false,
    autoComplete: 'tel',
  },
] as const

export function ProvisionAccountForm({
  onCode,
  canAssignRoles,
}: {
  onCode: (value: IssuedAccountCode) => void
  canAssignRoles: boolean
}) {
  const client = useQueryClient()
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: z.input<typeof provisionAccountSchema>) =>
      createEmployeeAccount({ data }),
    retry: false,
    gcTime: 0,
  })
  const form = useForm({
    defaultValues: { ...defaults },
    validators: { onSubmit: provisionAccountSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = await mutation.mutateAsync(value)
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        onCode(result.value)
        form.reset()
        toast.success('თანამშრომლის ანგარიში შექმნილია.')
        await client.invalidateQueries({ queryKey: ['employee-accounts'] })
      } catch {
        const message =
          'ანგარიშის შექმნა ვერ მოხერხდა. გადაამოწმეთ წვდომა და სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      } finally {
        mutation.reset()
      }
    },
  })
  return (
    <Card className="rounded-2xl">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IconUserPlus className="size-5" aria-hidden="true" />
          </span>
          ახალი თანამშრომელი
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <FieldGroup className="gap-5">
            {textFields.map(({ name, label, required, autoComplete }) => (
              <form.Field key={name} name={name}>
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={`provision-${name}`}>
                      {label}
                      {required ? (
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      ) : null}
                    </FieldLabel>
                    <Input
                      id={`provision-${name}`}
                      name={name}
                      autoComplete={autoComplete}
                      type={
                        name === 'contactEmail'
                          ? 'email'
                          : name === 'phone'
                            ? 'tel'
                            : 'text'
                      }
                      required={required}
                      autoCapitalize={name === 'code' ? 'none' : undefined}
                      spellCheck={name === 'code' ? false : undefined}
                      value={field.state.value ?? ''}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={!field.state.meta.isValid}
                      aria-describedby={`provision-${name}-error`}
                    />
                    <FieldError
                      id={`provision-${name}-error`}
                      errors={field.state.meta.errors}
                    />
                  </Field>
                )}
              </form.Field>
            ))}
            <form.Field name="role">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="provision-role">
                    როლი{' '}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </FieldLabel>
                  <Select
                    required
                    value={field.state.value}
                    disabled={!canAssignRoles}
                    onValueChange={(value) => {
                      const parsed = employeeRoleSchema.safeParse(value)
                      if (parsed.success) field.handleChange(parsed.data)
                    }}
                  >
                    <SelectTrigger
                      id="provision-role"
                      className="w-full"
                      aria-required="true"
                      aria-invalid={!field.state.meta.isValid}
                    >
                      <SelectValue>{roleLabels[field.state.value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {employeeRoleSchema.options.map((role) => (
                          <SelectItem key={role} value={role}>
                            {roleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="workingWeek">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <EmployeeScheduleField
                    value={field.state.value ?? null}
                    onChange={field.handleChange}
                    disabled={mutation.isPending}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(pending) => (
                <Button
                  type="submit"
                  className="h-10 w-full"
                  disabled={pending}
                  aria-busy={pending}
                >
                  <span className="flex size-4 items-center justify-center">
                    {pending ? (
                      <Spinner aria-hidden="true" />
                    ) : (
                      <IconUserPlus className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  ანგარიშის შექმნა
                </Button>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
