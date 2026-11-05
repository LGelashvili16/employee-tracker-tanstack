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
  FieldDescription,
  FieldError,
  FieldLabel,
} from '#/components/ui/field'
import { ownPhoneSchema } from '#/features/access/access.schemas'
import { updateOwnProfilePhone } from '../account.functions'
import { ownProfileQueryOptions } from '../account.queries'
import type { z } from 'zod'

export function OwnPhoneForm({
  actorId,
  phone,
}: {
  actorId: string
  phone: string | null
}) {
  const client = useQueryClient()
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: (data: z.input<typeof ownPhoneSchema>) =>
      updateOwnProfilePhone({ data }),
    retry: false,
    gcTime: 0,
  })
  const defaultValues: z.input<typeof ownPhoneSchema> = { phone: phone ?? '' }
  const form = useForm({
    defaultValues,
    validators: { onSubmit: ownPhoneSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = await mutation.mutateAsync(value)
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        await client.invalidateQueries({
          queryKey: ownProfileQueryOptions(actorId).queryKey,
        })
        toast.success('ტელეფონის ნომერი შენახულია.')
      } catch {
        const message = 'ტელეფონის ნომერი ვერ შეინახა. სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      } finally {
        mutation.reset()
      }
    },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="phone">
        {(field) => (
          <Field data-invalid={!field.state.meta.isValid}>
            <FieldLabel htmlFor="own-phone">ტელეფონის ნომერი</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="own-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="sm:max-w-xs"
                value={field.state.value ?? ''}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={!field.state.meta.isValid}
                aria-describedby="own-phone-error"
              />
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(pending) => (
                  <Button type="submit" disabled={pending} aria-busy={pending}>
                    <span className="flex size-4 items-center justify-center">
                      {pending ? (
                        <Spinner aria-hidden="true" />
                      ) : (
                        <IconDeviceFloppy aria-hidden="true" />
                      )}
                    </span>
                    შენახვა
                  </Button>
                )}
              </form.Subscribe>
            </div>
            {/* <FieldDescription>
              ნომერი გამოიყენება საკონტაქტო ინფორმაციად. გასაწმენდად დატოვეთ
              ველი ცარიელი.
            </FieldDescription> */}
            <FieldError id="own-phone-error" errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}
