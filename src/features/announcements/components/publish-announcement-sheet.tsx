import { useRef, useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { IconPlus } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Switch } from '#/components/ui/switch'
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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { announcementFormSchema } from '../announcements.schemas'
import { announcementKeys } from '../announcements.queries'
import { createAnnouncement } from '../announcements.functions'
import { notificationKeys } from '#/features/notifications/notifications.queries'

export function PublishAnnouncementSheet({
  actorId,
  onPublished,
}: {
  actorId: string
  onPublished: () => void
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const operation = useRef<{ id: string; signature: string } | null>(null)
  const client = useQueryClient()
  const form = useForm({
    defaultValues: { title: '', body: '', showOnLogin: false },
    validators: { onSubmit: announcementFormSchema },
    onSubmit: async ({ value }) => {
      setError('')
      const signature = JSON.stringify(value)
      if (operation.current?.signature !== signature)
        operation.current = { id: crypto.randomUUID(), signature }
      try {
        const result = await createAnnouncement({
          data: { ...value, requestId: operation.current.id },
        })
        if (!result.ok) throw new Error(result.message)
        await Promise.all([
          client.invalidateQueries({ queryKey: announcementKeys.all(actorId) }),
          client.invalidateQueries({ queryKey: notificationKeys.own(actorId) }),
        ])
        toast.success('განცხადება გამოქვეყნებულია.')
        operation.current = null
        form.reset()
        setOpen(false)
        onPublished()
      } catch {
        const message =
          'განცხადება ვერ გამოქვეყნდა. გადაამოწმეთ მონაცემები და სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      }
    },
  })
  const pending = useStore(form.store, (state) => state.isSubmitting)
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next)
      }}
    >
      <SheetTrigger render={<Button depth="raised" />}>
        <IconPlus data-icon="inline-start" aria-hidden="true" />
        ახალი განცხადება
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={!pending}
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="border-b">
          <SheetTitle>ახალი განცხადება</SheetTitle>
        </SheetHeader>
        <form
          noValidate
          className="min-h-0 flex-1 overflow-y-auto p-4"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field name="title">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="announcement-title">
                    სათაური{' '}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </FieldLabel>
                  <Input
                    id="announcement-title"
                    required
                    maxLength={160}
                    disabled={pending}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="announcement-title-error"
                  />
                  <FieldError
                    id="announcement-title-error"
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="body">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor="announcement-body">
                    ტექსტი{' '}
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  </FieldLabel>
                  <Textarea
                    id="announcement-body"
                    className="min-h-48"
                    required
                    rows={10}
                    maxLength={10000}
                    disabled={pending}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="announcement-body-error"
                  />
                  <FieldError
                    id="announcement-body-error"
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="showOnLogin">
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <div className="flex items-center justify-between gap-4">
                    <FieldLabel htmlFor="announcement-login">
                      შესვლისას ფანჯარაში ჩვენება
                    </FieldLabel>
                    <Switch
                      id="announcement-login"
                      disabled={pending}
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                      aria-describedby="announcement-delivery-help"
                    />
                  </div>
                  <p
                    id="announcement-delivery-help"
                    className="text-sm leading-6 text-muted-foreground"
                  >
                    {field.state.value
                      ? 'თანამშრომელი განცხადებას მომდევნო შესვლისას ნახავს. დახურვის ან წაკითხვის შემდეგ ფანჯარა აღარ გაიხსნება.'
                      : 'თანამშრომლები განცხადების შესახებ შეტყობინებას ზარის მენიუში მიიღებენ.'}
                  </p>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <SheetClose
                render={
                  <Button variant="outline" depth="raised" disabled={pending} />
                }
              >
                გაუქმება
              </SheetClose>
              <Button
                depth="raised"
                type="submit"
                disabled={pending}
                aria-busy={pending}
                className="min-w-36"
              >
                {pending ? <Spinner aria-hidden="true" /> : null}გამოქვეყნება
              </Button>
            </div>
          </FieldGroup>
        </form>
      </SheetContent>
    </Sheet>
  )
}
