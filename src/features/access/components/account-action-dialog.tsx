import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
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
import { cn } from '#/lib/utils'
import { updateEmployeeAccount } from '../access.functions'
import { accountActionSchema } from '../access.schemas'
import { accountActionContent } from './account-action-content'
import type { z } from 'zod'
import type { EmployeeAccountRecord, IssuedAccountCode } from '../access.types'
import type { AccountAction } from './account-action-content'

export function AccountActionDialog({
  target,
  action,
  onClose,
  onCode,
}: {
  target: EmployeeAccountRecord
  action: AccountAction
  onClose: () => void
  onCode: (value: IssuedAccountCode) => void
}) {
  const client = useQueryClient()
  const [error, setError] = useState('')
  const content = accountActionContent[action]
  const Icon = content.icon
  const ConfirmIcon = content.confirmIcon
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
          toast.error(result.message)
          return
        }
        await client.invalidateQueries({ queryKey: ['employee-accounts'] })
        toast.success(content.successMessage)
        if (result.value) onCode(result.value)
        onClose()
      } catch {
        const message =
          'მოქმედება ვერ შესრულდა. გადაამოწმეთ თქვენი წვდომა და სცადეთ ხელახლა.'
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
      <DialogContent showCloseButton={false} className="gap-5 sm:max-w-md">
        <DialogHeader className="items-center gap-3 pt-2 text-center">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-12 items-center justify-center rounded-full',
              content.destructive
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary',
            )}
          >
            <Icon className="size-6" />
          </span>
          <DialogTitle className="text-lg">{content.label}</DialogTitle>
          <DialogDescription className="text-balance">
            {content.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3">
          <span className="min-w-0 truncate text-sm font-medium">
            {target.name}
          </span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {target.code}
          </span>
        </div>
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
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="account-action-reason">
                    მოქმედების მიზეზი
                  </FieldLabel>
                  <Textarea
                    id="account-action-reason"
                    name="reason"
                    rows={3}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="account-action-error"
                  />
                  <FieldDescription>
                    მიზეზი ჩაიწერება აუდიტის ჟურნალში.
                  </FieldDescription>
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
                    <DialogClose
                      render={<Button variant="outline" disabled={pending} />}
                    >
                      გაუქმება
                    </DialogClose>
                    <Button
                      type="submit"
                      disabled={pending}
                      aria-busy={pending}
                      variant={content.destructive ? 'destructive' : 'default'}
                    >
                      <span className="flex size-4 items-center justify-center">
                        {pending ? (
                          <Spinner aria-hidden="true" />
                        ) : (
                          <ConfirmIcon aria-hidden="true" />
                        )}
                      </span>
                      {content.confirmLabel}
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
