import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { closeSickLeaveSchema } from '../leave.schemas'
import { finishSickLeave } from '../leave.functions'
import { leaveKey } from '../leave.queries'
import { LeaveDateInput } from './leave-date-input'
import type { LeaveItem } from '../leave.types'

export function CloseSickLeaveDialog({ item }: { item: LeaveItem }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const client = useQueryClient()
  const form = useForm({
    defaultValues: { id: item.id, revision: item.revision, endDate: '' },
    validators: { onSubmit: closeSickLeaveSchema },
    onSubmit: async ({ value }) => {
      setPending(true)
      setError('')
      try {
        const result = await finishSickLeave({ data: value })
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        toast.success('ბიულეტენი დახურულია.')
        setOpen(false)
        await client.invalidateQueries({ queryKey: leaveKey })
      } catch {
        const message =
          'ბიულეტენი ვერ დაიხურა. განაახლეთ სია და სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      } finally {
        setPending(false)
      }
    },
  })
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value)
          if (value) {
            form.reset()
            setError('')
          }
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        ბიულეტენის დახურვა
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>ბიულეტენის დახურვა</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.Field name="endDate">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={`close-sick-${item.id}`}>
                  ბიულეტენის ბოლო დღე <span aria-hidden="true">*</span>
                </FieldLabel>
                <LeaveDateInput
                  id={`close-sick-${item.id}`}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  disabled={pending}
                  invalid={!field.state.meta.isValid}
                />
                <FieldError
                  id={`close-sick-${item.id}-error`}
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
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? <Spinner aria-hidden="true" /> : null}დასრულების შენახვა
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
