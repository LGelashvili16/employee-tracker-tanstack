import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { IconDeviceFloppy } from '@tabler/icons-react'
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
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { updateEmployeeDetails } from '../access.functions'
import { employeeDetailsSchema } from '../access.schemas'
import { EmployeeScheduleField } from './employee-schedule-field'
import type { z } from 'zod'
import type { EmployeeAccountRecord } from '../access.types'

const detailFields = [
  { name: 'name', label: 'სახელი და გვარი', autoComplete: 'off' },
  { name: 'contactEmail', label: 'ელფოსტა', autoComplete: 'off' },
  { name: 'jobTitle', label: 'თანამდებობა', autoComplete: 'off' },
  { name: 'phone', label: 'ტელეფონის ნომერი', autoComplete: 'off' },
] as const

export function EmployeeDetailsSheet({
  open,
  target,
  canConfigureSchedule,
  onClose,
}: {
  open: boolean
  target: EmployeeAccountRecord
  /** Editing the working week additionally requires the attendance.configure permission. */
  canConfigureSchedule: boolean
  onClose: () => void
}) {
  const client = useQueryClient()
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: z.input<typeof employeeDetailsSchema>) =>
      updateEmployeeDetails({ data }),
    retry: false,
    gcTime: 0,
  })
  const defaultValues: z.input<typeof employeeDetailsSchema> = {
    userId: target.userId,
    name: target.name,
    contactEmail: target.contactEmail ?? '',
    jobTitle: target.jobTitle ?? '',
    phone: target.phone ?? '',
    // Undefined tells the server to leave the schedule untouched.
    workingWeek: canConfigureSchedule ? target.workingWeek : undefined,
  }
  const form = useForm({
    defaultValues,
    validators: { onSubmit: employeeDetailsSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = await mutation.mutateAsync(value)
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        await client.invalidateQueries({ queryKey: ['employee-accounts'] })
        toast.success('თანამშრომლის მონაცემები განახლებულია.')
        onClose()
      } catch {
        const message =
          'მონაცემები ვერ შეინახა. გადაამოწმეთ თქვენი წვდომა და სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      } finally {
        mutation.reset()
      }
    },
  })

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !form.state.isSubmitting) onClose()
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          form.reset()
          setError('')
        }
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={!mutation.isPending}
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="border-b">
          <SheetTitle>მონაცემების რედაქტირება</SheetTitle>
        </SheetHeader>
        <form
          noValidate
          className="min-h-0 flex-1 overflow-y-auto p-4"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <FieldGroup className="gap-4">
            <SheetDescription>
              მომხმარებლის სახელი ({target.code}) და როლი უცვლელია. ელფოსტის
              შეცვლა ცვლის შესვლის ელფოსტასაც, თუ ანგარიში მას იყენებს.
            </SheetDescription>
            {detailFields.map(({ name, label, autoComplete }) => (
              <form.Field key={name} name={name}>
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={`details-${name}`}>
                      {label}
                      {name === 'name' ? (
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      ) : null}
                    </FieldLabel>
                    <Input
                      id={`details-${name}`}
                      name={name}
                      type={name === 'contactEmail' ? 'email' : 'text'}
                      autoComplete={autoComplete}
                      required={name === 'name'}
                      disabled={mutation.isPending}
                      value={field.state.value ?? ''}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={!field.state.meta.isValid}
                      aria-describedby={`details-${name}-error`}
                    />
                    <FieldError
                      id={`details-${name}-error`}
                      errors={field.state.meta.errors}
                    />
                  </Field>
                )}
              </form.Field>
            ))}
            {canConfigureSchedule ? (
              <form.Field name="workingWeek">
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <EmployeeScheduleField
                      idPrefix="details"
                      value={field.state.value ?? null}
                      onChange={field.handleChange}
                      disabled={mutation.isPending}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <SheetFooter className="px-0 pb-0 sm:flex-row sm:justify-end">
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(pending) => (
                  <>
                    <SheetClose
                      render={<Button variant="outline" disabled={pending} />}
                    >
                      გაუქმება
                    </SheetClose>
                    <Button
                      type="submit"
                      disabled={pending}
                      aria-busy={pending}
                    >
                      <span className="flex size-4 items-center justify-center">
                        {pending ? (
                          <Spinner aria-hidden="true" />
                        ) : (
                          <IconDeviceFloppy aria-hidden="true" />
                        )}
                      </span>
                      შენახვა
                    </Button>
                  </>
                )}
              </form.Subscribe>
            </SheetFooter>
          </FieldGroup>
        </form>
      </SheetContent>
    </Sheet>
  )
}
