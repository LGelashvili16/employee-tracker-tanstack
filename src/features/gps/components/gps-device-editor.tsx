import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '#/components/ui/sheet'
import { Spinner } from '#/components/ui/spinner'
import { Switch } from '#/components/ui/switch'
import { updateGpsDevice } from '../gps.functions'
import { gpsDeviceSchema } from '../gps.schemas'
import { gpsKey } from '../gps.queries'
import type { GpsDeviceRow } from '../gps.queries'

export function GpsDeviceEditor({
  device,
  actorId,
  close,
  onBusyChange,
}: {
  device: GpsDeviceRow | null
  actorId: string
  close: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const client = useQueryClient()
  const save = useServerFn(updateGpsDevice)
  const [error, setError] = useState('')
  const form = useForm({
    defaultValues: {
      name: device?.name ?? '',
      reportedId: device?.reportedId ?? '',
      enabled: device?.enabled ?? true,
    },
    validators: { onSubmit: gpsDeviceSchema },
    onSubmit: async ({ value }) => {
      setError('')
      onBusyChange(true)
      try {
        const result = await save({
          data: device
            ? { ...value, id: device.id, version: device.version }
            : { ...value, id: null, version: null },
        })
        if (!result) {
          const message = device
            ? 'მოწყობილობის მონაცემები შეიცვალა. დახურეთ ფორმა და გახსენით ხელახლა.'
            : 'ამ იდენტიფიკატორით მოწყობილობა უკვე არსებობს.'
          setError(message)
          toast.error(message)
          void client.invalidateQueries({ queryKey: gpsKey(actorId) })
          return
        }
        toast.success('მოწყობილობა შენახულია.')
        void client.invalidateQueries({ queryKey: gpsKey(actorId) })
        close()
      } catch {
        const message = 'შენახვა ვერ მოხერხდა. სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      } finally {
        onBusyChange(false)
      }
    },
  })

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(pending) => (
        <SheetContent
          className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-sm"
          showCloseButton={!pending}
        >
          <SheetHeader className="shrink-0 border-b px-5 py-4 pr-12">
            <SheetTitle>
              {device ? 'მოწყობილობის რედაქტირება' : 'მოწყობილობის დამატება'}
            </SheetTitle>
            <SheetDescription>პროტოკოლი: JT808</SheetDescription>
          </SheetHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault()
              void form.handleSubmit()
            }}
            noValidate
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <Card>
                <CardContent>
                  <FieldGroup className="gap-4">
                    <form.Field name="name">
                      {(field) => (
                        <Field data-invalid={!field.state.meta.isValid}>
                          <FieldLabel htmlFor="gps-name">
                            სახელი <span aria-hidden="true">*</span>
                          </FieldLabel>
                          <Input
                            id="gps-name"
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            onBlur={field.handleBlur}
                            aria-invalid={!field.state.meta.isValid}
                            required
                            maxLength={100}
                            disabled={pending}
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="reportedId">
                      {(field) => (
                        <Field data-invalid={!field.state.meta.isValid}>
                          <FieldLabel htmlFor="gps-id">
                            GPS მოწყობილობის იდენტიფიკატორი{' '}
                            <span aria-hidden="true">*</span>
                          </FieldLabel>
                          <Input
                            id="gps-id"
                            inputMode="numeric"
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            onBlur={field.handleBlur}
                            aria-invalid={!field.state.meta.isValid}
                            required
                            maxLength={20}
                            readOnly={Boolean(device)}
                            disabled={pending}
                          />
                          <FieldError errors={field.state.meta.errors} />
                        </Field>
                      )}
                    </form.Field>
                    <Separator />
                    <form.Field name="enabled">
                      {(field) => (
                        <Field orientation="horizontal">
                          <FieldLabel htmlFor="gps-enabled">
                            მოწყობილობა ჩართულია
                          </FieldLabel>
                          <Switch
                            id="gps-enabled"
                            checked={field.state.value}
                            onCheckedChange={field.handleChange}
                            disabled={pending}
                          />
                        </Field>
                      )}
                    </form.Field>
                    {error && <FieldError role="alert">{error}</FieldError>}
                  </FieldGroup>
                </CardContent>
              </Card>
            </div>
            <SheetFooter className="shrink-0 border-t px-5 py-4">
              <Button type="submit" disabled={pending} aria-busy={pending}>
                {pending && <Spinner />} შენახვა
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      )}
    </form.Subscribe>
  )
}
