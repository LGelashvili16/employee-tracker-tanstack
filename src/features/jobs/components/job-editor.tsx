import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
} from '@tabler/icons-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'
import { Textarea } from '#/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Spinner } from '#/components/ui/spinner'
import { Switch } from '#/components/ui/switch'
import { createJob, editJob } from '../jobs.functions'
import {
  jobEditorSchema,
  jobFieldsSchema,
  jobKindSchema,
} from '../jobs.schemas'
import { jobKinds } from '../jobs.presentation'
import { jobAddressQueryOptions, jobsKeys } from '../jobs.queries'
import { JobConflictReview } from './job-conflict-review'
import { JobDeadlinePicker } from './job-deadline-picker'
import type { z } from 'zod'
import type { JobDetail, JobKind } from '../jobs.types'

export function JobEditor({
  actorId,
  job,
  position,
  suggestedAddress,
  suggestedKind,
  onClose,
  onSaved,
}: {
  actorId: string
  job?: JobDetail
  position?: { longitude: number; latitude: number }
  suggestedAddress?: string
  suggestedKind?: JobKind
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const client = useQueryClient()
  const shouldSuggestAddress = !job && Boolean(position) && !suggestedAddress
  const addressOptions = jobAddressQueryOptions(actorId, position)
  const addressLookup = useQuery({ ...addressOptions, enabled: false })
  const addressLookupFailed =
    shouldSuggestAddress &&
    (addressLookup.isError || (addressLookup.isSuccess && !addressLookup.data))
  const [requestId] = useState(() => crypto.randomUUID())
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [version, setVersion] = useState(job?.version)
  const mutation = useMutation({
    mutationFn: (fields: z.infer<typeof jobFieldsSchema>) =>
      job
        ? editJob({
            data: { ...fields, id: job.id, version: version ?? job.version },
          })
        : createJob({ data: { ...fields, requestId } }),
    retry: false,
  })
  const form = useForm({
    defaultValues: {
      title: job?.title ?? '',
      address: job?.address ?? suggestedAddress ?? '',
      notes: job?.notes ?? '',
      kind: job?.kind ?? suggestedKind ?? 'installation',
      deadline: job?.deadline ?? null,
      longitude: job?.longitude ?? position?.longitude ?? null,
      latitude: job?.latitude ?? position?.latitude ?? null,
      hasCoordinates: Boolean(
        position || (job?.longitude != null && job.latitude != null),
      ),
    } satisfies z.infer<typeof jobEditorSchema>,
    validators: { onChange: jobEditorSchema, onSubmit: jobEditorSchema },
    onSubmit: async ({ value }) => {
      if (conflict) return
      setError('')
      try {
        const result = await mutation.mutateAsync(jobFieldsSchema.parse(value))
        if (!result.ok) {
          setError(result.message)
          setConflict(result.code === 'conflict')
          toast.error(result.message)
          return
        }
        toast.success(
          (job ? 'სამუშაო განახლებულია.' : 'სამუშაო დამატებულია.') +
            (result.value.streetNamesAvailable === false
              ? ' ქუჩის ზოგიერთი სახელი ვერ მოიძებნა; მითითებული მისამართი შენახულია.'
              : ''),
        )
        void client.invalidateQueries({ queryKey: jobsKeys.all(actorId) })
        onSaved(result.value.id)
      } catch {
        const message =
          'შენახვა ვერ მოხერხდა. გადაამოწმეთ წვდომა და სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
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
        className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        aria-describedby={undefined}
        showCloseButton={!mutation.isPending}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
          <DialogTitle>
            {job ? 'სამუშაოს რედაქტირება' : 'ახალი სამუშაო'}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-col"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <FieldGroup>
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <form.Field name="title">
                  {(field) => (
                    <Field data-invalid={!field.state.meta.isValid}>
                      <FieldLabel htmlFor="job-title" className="gap-1">
                        სათაური{' '}
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      </FieldLabel>
                      <Input
                        id="job-title"
                        autoFocus
                        required
                        maxLength={160}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={!field.state.meta.isValid}
                        aria-describedby={
                          field.state.meta.errors.length
                            ? 'job-title-error'
                            : undefined
                        }
                      />
                      <FieldError
                        id="job-title-error"
                        errors={field.state.meta.errors}
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="kind">
                  {(field) => (
                    <Field data-invalid={!field.state.meta.isValid}>
                      <FieldLabel htmlFor="job-kind" className="gap-1">
                        სამუშაოს ტიპი{' '}
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      </FieldLabel>
                      <Select
                        value={field.state.value}
                        items={Object.entries(jobKinds).map(
                          ([value, item]) => ({
                            value,
                            label: item.label,
                          }),
                        )}
                        onValueChange={(value) => {
                          const parsed = jobKindSchema.safeParse(value)
                          if (parsed.success) field.handleChange(parsed.data)
                        }}
                      >
                        <SelectTrigger
                          id="job-kind"
                          className="w-full"
                          aria-required="true"
                          aria-invalid={!field.state.meta.isValid}
                          aria-describedby={
                            field.state.meta.errors.length
                              ? 'job-kind-error'
                              : undefined
                          }
                          onBlur={field.handleBlur}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {jobKindSchema.options.map((kind) => (
                              <SelectItem key={kind} value={kind}>
                                {jobKinds[kind].label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldError
                        id="job-kind-error"
                        errors={field.state.meta.errors}
                      />
                    </Field>
                  )}
                </form.Field>
              </div>
              <form.Field
                name="address"
                listeners={{
                  onMount: ({ fieldApi }) => {
                    if (!shouldSuggestAddress || !position) return
                    // Initialize this field through Form's lifecycle; Query deduplicates requests and owns loading/cache state.
                    void client
                      .fetchQuery(addressOptions)
                      .then((address) => {
                        const current = fieldApi.form.state
                        if (
                          !address ||
                          fieldApi.state.meta.isDirty ||
                          fieldApi.state.value ||
                          current.isSubmitting ||
                          current.isSubmitSuccessful ||
                          !current.values.hasCoordinates ||
                          current.values.longitude !== position.longitude ||
                          current.values.latitude !== position.latitude
                        )
                          return
                        fieldApi.setValue(address, {
                          dontUpdateMeta: true,
                          dontValidate: true,
                        })
                      })
                      .catch(() => {
                        /* The editable field displays lookup failure without blocking the form. */
                      })
                  },
                }}
              >
                {(field) => {
                  const autoFilled =
                    !job &&
                    !field.state.meta.isDirty &&
                    Boolean(field.state.value) &&
                    (field.state.value === suggestedAddress ||
                      field.state.value === addressLookup.data)
                  return (
                    <Field data-invalid={!field.state.meta.isValid}>
                      <FieldLabel htmlFor="job-address">მისამართი</FieldLabel>
                      <InputGroup
                        aria-busy={
                          shouldSuggestAddress && addressLookup.isFetching
                        }
                      >
                        <InputGroupInput
                          id="job-address"
                          maxLength={300}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          aria-invalid={!field.state.meta.isValid}
                          aria-describedby={
                            field.state.meta.errors.length
                              ? 'job-address-error'
                              : addressLookupFailed && !field.state.value
                                ? 'job-address-lookup-status'
                                : autoFilled
                                  ? 'job-address-review'
                                  : undefined
                          }
                        />
                        {shouldSuggestAddress && addressLookup.isFetching ? (
                          <InputGroupAddon align="inline-end">
                            <Spinner aria-hidden="true" />
                            <span role="status" className="sr-only">
                              მისამართი იძებნება
                            </span>
                          </InputGroupAddon>
                        ) : null}
                      </InputGroup>
                      {autoFilled ? (
                        <Alert
                          id="job-address-review"
                          variant="info"
                          role="status"
                        >
                          <IconInfoCircle aria-hidden="true" />
                          <AlertDescription>
                            მისამართი ავტომატურად შეივსო. გადაამოწმეთ ქუჩის
                            დასახელება.
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      {addressLookupFailed && !field.state.value ? (
                        <Alert
                          id="job-address-lookup-status"
                          variant="warning"
                          role="status"
                        >
                          <IconAlertTriangle aria-hidden="true" />
                          <AlertDescription>
                            მისამართი ვერ მოიძებნა. შეგიძლიათ ხელით მიუთითოთ.
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      <FieldError
                        id="job-address-error"
                        errors={field.state.meta.errors}
                      />
                    </Field>
                  )
                }}
              </form.Field>
              <form.Field name="deadline">
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor="job-deadline">ვადა</FieldLabel>
                    <JobDeadlinePicker
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      disabled={mutation.isPending}
                      invalid={!field.state.meta.isValid}
                      describedBy={
                        field.state.meta.errors.length
                          ? 'job-deadline-error'
                          : undefined
                      }
                    />
                    <FieldError
                      id="job-deadline-error"
                      errors={field.state.meta.errors}
                    />
                  </Field>
                )}
              </form.Field>
              <FieldGroup className="gap-4 rounded-xl border bg-muted/30 p-4">
                <form.Field name="hasCoordinates">
                  {(field) => (
                    <Field orientation="horizontal">
                      <FieldLabel
                        htmlFor="job-has-coordinates"
                        className="flex-1"
                      >
                        ზუსტი მდებარეობა რუკაზე
                      </FieldLabel>
                      <Switch
                        id="job-has-coordinates"
                        checked={field.state.value}
                        onBlur={field.handleBlur}
                        onCheckedChange={(checked) => {
                          form.setFieldValue(
                            'longitude',
                            checked
                              ? (job?.longitude ?? position?.longitude ?? null)
                              : null,
                          )
                          form.setFieldValue(
                            'latitude',
                            checked
                              ? (job?.latitude ?? position?.latitude ?? null)
                              : null,
                          )
                          field.handleChange(checked)
                        }}
                        aria-controls={
                          field.state.value ? 'job-coordinates' : undefined
                        }
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Subscribe
                  selector={(state) => state.values.hasCoordinates}
                >
                  {(hasCoordinates) =>
                    hasCoordinates ? (
                      <FieldGroup id="job-coordinates" className="gap-3">
                        <div className="grid grid-cols-2 gap-4">
                          {(
                            [
                              {
                                name: 'latitude',
                                label: 'განედი',
                                min: -85,
                                max: 85,
                              },
                              {
                                name: 'longitude',
                                label: 'გრძედი',
                                min: -180,
                                max: 180,
                              },
                            ] as const
                          ).map(({ name, label, min, max }) => (
                            <form.Field key={name} name={name}>
                              {(field) => (
                                <Field data-invalid={!field.state.meta.isValid}>
                                  <FieldLabel
                                    htmlFor={`job-${name}`}
                                    className="gap-1"
                                  >
                                    {label}{' '}
                                    <span
                                      aria-hidden="true"
                                      className="text-destructive"
                                    >
                                      *
                                    </span>
                                  </FieldLabel>
                                  <Input
                                    id={`job-${name}`}
                                    type="number"
                                    required
                                    inputMode="decimal"
                                    step="any"
                                    min={min}
                                    max={max}
                                    value={field.state.value ?? ''}
                                    onBlur={field.handleBlur}
                                    onChange={(event) =>
                                      field.handleChange(
                                        event.target.value === ''
                                          ? null
                                          : event.target.valueAsNumber,
                                      )
                                    }
                                    aria-invalid={!field.state.meta.isValid}
                                    aria-describedby={
                                      field.state.meta.errors.length
                                        ? `job-location-help job-${name}-error`
                                        : 'job-location-help'
                                    }
                                  />
                                  <FieldError
                                    id={`job-${name}-error`}
                                    errors={field.state.meta.errors}
                                  />
                                </Field>
                              )}
                            </form.Field>
                          ))}
                        </div>
                        <p
                          id="job-location-help"
                          className="text-sm text-muted-foreground"
                        >
                          მდებარეობა საქართველოს ტერიტორიაზე უნდა იყოს.
                        </p>
                      </FieldGroup>
                    ) : null
                  }
                </form.Subscribe>
              </FieldGroup>
              <form.Field name="notes">
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor="job-notes">
                      ინსტრუქციები და შენიშვნები
                    </FieldLabel>
                    <Textarea
                      id="job-notes"
                      rows={4}
                      className="min-h-24 resize-y"
                      maxLength={4000}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={!field.state.meta.isValid}
                      aria-describedby={
                        field.state.meta.errors.length
                          ? 'job-notes-error'
                          : undefined
                      }
                    />
                    <FieldError
                      id="job-notes-error"
                      errors={field.state.meta.errors}
                    />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
            <form.Subscribe selector={(state) => state.errors}>
              {(errors) =>
                errors.length ? (
                  <p role="alert" className="mt-4 text-sm text-destructive">
                    გადაამოწმეთ მონიშნული ველები.
                  </p>
                ) : null
              }
            </form.Subscribe>
            {conflict && job ? (
              <JobConflictReview
                actorId={actorId}
                id={job.id}
                canContinue={(current) =>
                  current.status !== 'completed' &&
                  current.status !== 'rejected'
                }
                onReviewed={(current) => {
                  setVersion(current.version)
                  setConflict(false)
                  setError('')
                }}
              />
            ) : null}
            {error && !conflict ? (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="m-0 shrink-0 px-6 py-4">
            <Button
              variant="outline"
              depth="raised"
              type="button"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              გაუქმება
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || conflict}
              aria-busy={mutation.isPending}
              className="min-w-32"
            >
              {mutation.isPending ? (
                <Spinner aria-hidden="true" />
              ) : (
                <IconCheck aria-hidden="true" />
              )}
              {job ? 'შენახვა' : 'სამუშაოს დამატება'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
