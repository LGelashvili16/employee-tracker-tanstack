import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Textarea } from '#/components/ui/textarea'
import { Spinner } from '#/components/ui/spinner'
import { changeJobStatus } from '../jobs.functions'
import { jobTransitionSchema } from '../jobs.schemas'
import { jobStatuses } from '../jobs.presentation'
import { jobsKeys } from '../jobs.queries'
import { allowedJobTransitions } from '../jobs.rules'
import { JobConflictReview } from './job-conflict-review'
import type { Actor } from '#/lib/authorization/actor'
import type { JobDetail, JobStatus } from '../jobs.types'

export function JobTransitionDialog({
  actor,
  job,
  status,
  onClose,
}: {
  actor: Actor
  job: JobDetail
  status: JobStatus
  onClose: () => void
}) {
  const client = useQueryClient()
  const actorId = actor.id
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const mutation = useMutation({
    mutationFn: (data: {
      id: string
      version: number
      status: JobStatus
      note: string
    }) => changeJobStatus({ data }),
    retry: false,
  })
  const required = status === 'rejected' || status === 'pending'
  const StatusIcon = jobStatuses[status].icon
  const form = useForm({
    defaultValues: { id: job.id, version: job.version, status, note: '' },
    validators: {
      onChange: jobTransitionSchema,
      onSubmit: jobTransitionSchema,
    },
    onSubmit: async ({ value }) => {
      if (conflict) return
      setError('')
      try {
        const result = await mutation.mutateAsync(value)
        if (!result.ok) {
          setError(result.message)
          setConflict(result.code === 'conflict')
          toast.error(result.message)
          void client.invalidateQueries({ queryKey: jobsKeys.all(actorId) })
          return
        }
        toast.success('სამუშაოს სტატუსი განახლებულია.')
        void client.invalidateQueries({ queryKey: jobsKeys.all(actorId) })
        onClose()
      } catch {
        const message =
          'სტატუსი ვერ შეიცვალა. გადაამოწმეთ წვდომა და სცადეთ ხელახლა.'
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
      <DialogContent showCloseButton={!mutation.isPending}>
        <DialogHeader>
          <DialogTitle>{jobStatuses[status].action}</DialogTitle>
          <DialogDescription className="break-words">
            {job.title}
            {status === 'en_route'
              ? '. სამუშაო თქვენ მოგენიჭებათ.'
              : status === 'pending'
                ? '. სამუშაო ისევ ხელმისაწვდომი გახდება და მიმდინარე პასუხისმგებელი მოიხსნება.'
                : ''}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.Field name="note">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor="job-progress-note">
                  {required ? 'მიზეზი' : 'შენიშვნა'}
                  {required ? (
                    <span aria-hidden="true" className="text-destructive">
                      *
                    </span>
                  ) : null}
                </FieldLabel>
                <Textarea
                  id="job-progress-note"
                  rows={4}
                  maxLength={2000}
                  aria-required={required}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={!field.state.meta.isValid}
                  aria-describedby="job-progress-error"
                />
                <FieldError
                  id="job-progress-error"
                  errors={field.state.meta.errors}
                />
              </Field>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.errors}>
            {(errors) =>
              errors.length ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  გადაამოწმეთ მითითებული მიზეზი.
                </p>
              ) : null
            }
          </form.Subscribe>
          {conflict ? (
            <JobConflictReview
              actorId={actorId}
              id={job.id}
              canContinue={(current) =>
                allowedJobTransitions(actor, current).includes(status)
              }
              onReviewed={(current) => {
                form.setFieldValue('version', current.version)
                setConflict(false)
                setError('')
              }}
            />
          ) : null}
          {error && !conflict ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              depth="raised"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              გაუქმება
            </Button>
            <Button
              type="submit"
              variant={status === 'rejected' ? 'destructive' : 'default'}
              depth="raised"
              disabled={mutation.isPending || conflict}
              aria-busy={mutation.isPending}
              className="min-w-32"
            >
              {mutation.isPending ? (
                <Spinner aria-hidden="true" />
              ) : (
                <StatusIcon aria-hidden="true" />
              )}
              {jobStatuses[status].action}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
