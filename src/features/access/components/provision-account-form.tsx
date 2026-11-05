import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { roleLabels } from '#/lib/authorization/permissions'
import { createEmployeeAccount } from '../access.functions'
import { employeeRoleSchema, provisionAccountSchema } from '../access.schemas'
import type { z } from 'zod'
import type { IssuedAccountCode } from '../access.types'

const defaults: z.input<typeof provisionAccountSchema> = {
  code: '',
  name: '',
  contactEmail: '',
  role: 'employee',
  reason: '',
}
const textFields = [
  { name: 'code', label: 'თანამშრომლის კოდი და შესვლის სახელი' },
  { name: 'name', label: 'სახელი და გვარი' },
  { name: 'contactEmail', label: 'საკონტაქტო ელფოსტა (არასავალდებულო)' },
  { name: 'reason', label: 'შექმნის მიზეზი' },
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
          return
        }
        onCode(result.value)
        form.reset()
        await client.invalidateQueries({ queryKey: ['employee-accounts'] })
      } catch {
        setError(
          'ანგარიშის შექმნა ვერ მოხერხდა. გადაამოწმეთ წვდომა და სცადეთ ხელახლა.',
        )
      } finally {
        mutation.reset()
      }
    },
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>თანამშრომლის ანგარიშის შექმნა</CardTitle>
        <CardDescription>
          ელფოსტა არასავალდებულოა. თითო თანამშრომელს აქვს ერთი ანგარიში და
          უნიკალური კოდი. პაროლს თანამშრომელი თავად აირჩევს.
        </CardDescription>
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
            {textFields.map(({ name, label }) => (
              <form.Field key={name} name={name}>
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={`provision-${name}`}>
                      {label}
                    </FieldLabel>
                    <Input
                      id={`provision-${name}`}
                      name={name}
                      autoComplete="off"
                      value={field.state.value}
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
                <Field>
                  <FieldLabel htmlFor="provision-role">როლი</FieldLabel>
                  <Select
                    value={field.state.value}
                    disabled={!canAssignRoles}
                    onValueChange={(value) => {
                      const parsed = employeeRoleSchema.safeParse(value)
                      if (parsed.success) field.handleChange(parsed.data)
                    }}
                  >
                    <SelectTrigger id="provision-role">
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
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(pending) => (
                <Button type="submit" disabled={pending} aria-busy={pending}>
                  <span className="flex size-4 items-center justify-center">
                    {pending ? <Spinner aria-hidden="true" /> : null}
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
