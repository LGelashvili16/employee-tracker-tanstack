import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { IconDeviceFloppy, IconUserEdit } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Spinner } from '#/components/ui/spinner'
import { Textarea } from '#/components/ui/textarea'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
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

export function EmployeeDetailsDialog({
  target,
  canConfigureSchedule,
  onClose,
}: {
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
    reason: '',
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader className="items-center gap-3 pt-2 text-center">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <IconUserEdit className="size-6" />
          </span>
          <DialogTitle className="text-lg">მონაცემების რედაქტირება</DialogTitle>
          <DialogDescription className="text-balance">
            მომხმარებლის სახელი ({target.code}) და როლი უცვლელია. ელფოსტის
            შეცვლა ცვლის შესვლის ელფოსტასაც, თუ ანგარიში მას იყენებს.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <FieldGroup className="gap-4">
            {detailFields.map(({ name, label, autoComplete }) => (
              <form.Field key={name} name={name}>
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={`details-${name}`}>{label}</FieldLabel>
                    <Input
                      id={`details-${name}`}
                      name={name}
                      type={name === 'contactEmail' ? 'email' : 'text'}
                      autoComplete={autoComplete}
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
            <form.Field name="reason">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="details-reason">
                    ცვლილების მიზეზი
                  </FieldLabel>
                  <Textarea
                    id="details-reason"
                    name="reason"
                    rows={3}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="details-reason-error"
                  />
                  <FieldDescription>
                    მიზეზი ჩაიწერება აუდიტის ჟურნალში.
                  </FieldDescription>
                  <FieldError
                    id="details-reason-error"
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(pending) => (
                  <>
                    <DialogClose
                      render={<Button variant="outline" disabled={pending} />}
                    >
                      გაუქმება
                    </DialogClose>
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
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
