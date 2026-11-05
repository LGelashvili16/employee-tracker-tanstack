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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { updateEmployeeAccount } from '../access.functions'
import { accountActionSchema } from '../access.schemas'
import type { z } from 'zod'
import type { EmployeeAccountRecord, IssuedAccountCode } from '../access.types'

type Action = z.infer<typeof accountActionSchema>['action']
export const accountActionLabels: Record<Action, string> = {
  issue_activation: 'გააქტიურების კოდის გაცემა',
  issue_reset: 'აღდგენის კოდის გაცემა',
  suspend: 'წვდომის შეჩერება',
  restore: 'წვდომის აღდგენა',
}

export function AccountActionDialog({
  target,
  action,
  onClose,
  onCode,
}: {
  target: EmployeeAccountRecord
  action: Action
  onClose: () => void
  onCode: (value: IssuedAccountCode) => void
}) {
  const client = useQueryClient()
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof accountActionSchema>) =>
      updateEmployeeAccount({ data }),
    retry: false,
    gcTime: 0,
  })
  const form = useForm({
    defaultValues: { userId: target.userId, action, reason: '' },
    validators: { onSubmit: accountActionSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = await mutation.mutateAsync(value)
        if (!result.ok) {
          setError(result.message)
          return
        }
        await client.invalidateQueries({ queryKey: ['employee-accounts'] })
        if (result.value) onCode(result.value)
        onClose()
      } catch {
        setError(
          'მოქმედება ვერ შესრულდა. გადაამოწმეთ თქვენი წვდომა და სცადეთ ხელახლა.',
        )
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
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{accountActionLabels[action]}</DialogTitle>
          <DialogDescription>
            {target.name} ({target.code}). კოდი მხოლოდ ერთხელ გამოჩნდება.
            შეჩერება აუქმებს მიმდინარე სესიებსა და გამოუყენებელ კოდებს.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field name="reason">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="account-action-reason">
                    მოქმედების მიზეზი
                  </FieldLabel>
                  <Input
                    id="account-action-reason"
                    name="reason"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="account-action-error"
                  />
                  <FieldError
                    id="account-action-error"
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
                    <Button
                      type="submit"
                      disabled={pending}
                      aria-busy={pending}
                      variant={action === 'suspend' ? 'destructive' : 'default'}
                    >
                      <span className="flex size-4 items-center justify-center">
                        {pending ? <Spinner aria-hidden="true" /> : null}
                      </span>
                      დადასტურება
                    </Button>
                    <DialogClose
                      render={<Button variant="outline" disabled={pending} />}
                    >
                      გაუქმება
                    </DialogClose>
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
