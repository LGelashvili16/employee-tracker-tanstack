import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '#/components/ui/dialog'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '#/components/ui/field'
import { Textarea } from '#/components/ui/textarea'
import { Spinner } from '#/components/ui/spinner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { parseRoles } from '#/lib/authorization/permissions'
import { adminAccountKeys } from '../admin-access.queries'
import {
  performAdminAccountAction,
  saveAccountAuthorization,
} from '../admin-access.functions'
import type { adminAccountActionSchema } from '../admin-access.schemas'
import {
  adminAccountActionFormSchema,
  updateAccountAuthorizationSchema,
} from '../admin-access.schemas'
import {
  AccountPermissionFields,
  AccountRoleFields,
} from './account-authorization-fields'
import type { AdminAccount } from '../admin-access.types'
import type { z } from 'zod'

export type AdminAccountAction = z.infer<
  typeof adminAccountActionSchema
>['action']
export const adminActionLabels = {
  suspend: 'წვდომის შეჩერება',
  restore: 'წვდომის აღდგენა',
  revoke_sessions: 'სესიების გაუქმება',
  authorization: 'როლებისა და უფლებების შეცვლა',
}

export function AdminAccountDialog({
  account,
  action,
  owner,
  onClose,
}: {
  account: AdminAccount
  action: AdminAccountAction | 'authorization'
  owner: boolean
  onClose: () => void
}) {
  const client = useQueryClient()
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: async (
      value: z.infer<typeof updateAccountAuthorizationSchema>,
    ) =>
      action === 'authorization'
        ? saveAccountAuthorization({ data: value })
        : performAdminAccountAction({
            data: { userId: account.userId, action, reason: value.reason },
          }),
    retry: false,
  })
  const form = useForm({
    defaultValues: {
      userId: account.userId,
      roles: parseRoles(account.roles),
      permissionOverrides: account.permissionOverrides,
      expectedRoles: account.roles,
      expectedOverrides: account.permissionOverrides,
      reason: '',
    },
    validators: {
      onSubmit:
        action === 'authorization'
          ? updateAccountAuthorizationSchema
          : adminAccountActionFormSchema,
    },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = await mutation.mutateAsync(value)
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        await Promise.all([
          client.invalidateQueries({ queryKey: adminAccountKeys.all }),
          client.invalidateQueries({ queryKey: ['employee-accounts'] }),
        ])
        toast.success('ანგარიშის წვდომა განახლებულია.')
        onClose()
      } catch {
        const message =
          'მოქმედება ვერ შესრულდა. გადაამოწმეთ წვდომა და სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      }
    },
  })
  const pending = useStore(form.store, (state) => state.isSubmitting)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto overscroll-contain sm:max-w-2xl"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>
            {adminActionLabels[action]}: {account.name}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            {action === 'authorization' ? (
              <>
                <Alert role="note" variant="warning">
                  <AlertDescription>
                    ცვლილების შემდეგ სესიები და გააქტიურებისა თუ აღდგენის
                    არსებული კოდები გაუქმდება.
                  </AlertDescription>
                </Alert>
                <form.Field name="roles">
                  {(field) => (
                    <>
                      <AccountRoleFields
                        value={field.state.value}
                        onChange={field.handleChange}
                        owner={owner}
                        disabled={pending}
                        invalid={!field.state.meta.isValid}
                      />
                      <FieldError
                        id="admin-roles-error"
                        errors={field.state.meta.errors}
                      />
                    </>
                  )}
                </form.Field>
                <form.Subscribe selector={(state) => state.values.roles}>
                  {(roles) => (
                    <form.Field name="permissionOverrides">
                      {(field) => (
                        <>
                          <AccountPermissionFields
                            roles={roles}
                            value={field.state.value}
                            onChange={field.handleChange}
                            disabled={pending}
                            invalid={!field.state.meta.isValid}
                          />
                          <FieldError
                            id="admin-permissions-error"
                            errors={field.state.meta.errors}
                          />
                        </>
                      )}
                    </form.Field>
                  )}
                </form.Subscribe>
              </>
            ) : (
              <Alert
                role="note"
                variant={action === 'restore' ? 'info' : 'warning'}
              >
                <AlertDescription>
                  {action === 'suspend'
                    ? 'ანგარიშში შესვლა შეწყდება და ყველა სესია გაუქმდება. დასწრების ისტორია შენარჩუნდება.'
                    : action === 'restore'
                      ? 'ანგარიშში შესვლა აღდგება. თანამშრომლის დასაქმების სტატუსი უცვლელი რჩება.'
                      : 'მომხმარებელს ყველა მოწყობილობაზე ხელახლა შესვლა დასჭირდება. გააქტიურებისა და აღდგენის არსებული კოდებიც გაუქმდება.'}
                </AlertDescription>
              </Alert>
            )}
            <form.Field name="reason">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="admin-action-reason">
                    მიზეზი <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <Textarea
                    id="admin-action-reason"
                    name="reason"
                    required
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="admin-reason-error"
                    disabled={pending}
                  />
                  <FieldError
                    id="admin-reason-error"
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                depth="raised"
                disabled={pending}
                onClick={onClose}
              >
                გაუქმება
              </Button>
              <Button type="submit" disabled={pending} aria-busy={pending}>
                <span
                  className="flex size-4 items-center justify-center"
                  aria-hidden="true"
                >
                  {pending ? <Spinner /> : null}
                </span>
                დადასტურება
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
