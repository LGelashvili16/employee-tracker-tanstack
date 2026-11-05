import type { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { updateAttendanceReviewer } from '../attendance.functions'
import { attendanceAssignmentSchema } from '../attendance.schemas'

type Choice = { id: string; name: string }
export function AttendanceAssignmentForm({
  employees,
  reviewers,
}: {
  employees: Array<Choice>
  reviewers: Array<Choice>
}) {
  const call = useServerFn(updateAttendanceReviewer)
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof attendanceAssignmentSchema>) =>
      call({ data }),
    retry: false,
  })
  const form = useForm({
    defaultValues: {
      employeeId: '',
      reviewerId: '',
      revoke: false,
      reason: '',
    },
    validators: { onSubmit: attendanceAssignmentSchema },
    onSubmit: async ({ value }) => {
      const result = await mutation.mutateAsync(value).catch(() => null)
      if (!result?.ok) {
        toast.error(result?.message ?? 'მინიჭება ვერ შეინახა.')
        return
      }
      toast.success(
        value.revoke
          ? 'ხელმძღვანელის მინიჭება გაუქმებულია.'
          : 'ხელმძღვანელი მინიჭებულია.',
      )
      form.reset()
      await client.invalidateQueries({ queryKey: ['attendance-configuration'] })
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
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          ხელმძღვანელს სჭირდება დასწრების განხილვის უფლება და კონკრეტული
          თანამშრომლის მინიჭება. საკუთარი ჩანაწერის დადასტურება ან შესწორება
          დაუშვებელია.
        </p>
        {(['employeeId', 'reviewerId'] as const).map((name) => (
          <form.Field key={name} name={name}>
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={name}>
                  {name === 'employeeId' ? 'თანამშრომელი' : 'ხელმძღვანელი'}
                </FieldLabel>
                <Select
                  value={field.state.value || null}
                  onValueChange={(value) => field.handleChange(value ?? '')}
                  items={(name === 'employeeId' ? employees : reviewers).map(
                    (item) => ({ value: item.id, label: item.name }),
                  )}
                >
                  <SelectTrigger
                    id={name}
                    className="w-full"
                    onBlur={field.handleBlur}
                    aria-invalid={!field.state.meta.isValid}
                  >
                    <SelectValue placeholder="აირჩიეთ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(name === 'employeeId' ? employees : reviewers).map(
                        (item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        ))}
        <form.Field name="revoke">
          {(field) => (
            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="revoke-reviewer"
                  checked={field.state.value}
                  onCheckedChange={(value) =>
                    field.handleChange(value === true)
                  }
                />
                <FieldLabel htmlFor="revoke-reviewer">
                  არსებული მინიჭების გაუქმება
                </FieldLabel>
              </div>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="reason">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor="assignment-reason">
                ცვლილების მიზეზი
              </FieldLabel>
              <Input
                id="assignment-reason"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={!field.state.meta.isValid}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(pending) => (
            <Button
              className="relative h-11 px-10"
              type="submit"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? (
                <Spinner className="absolute left-4" aria-hidden="true" />
              ) : null}
              მინიჭების შენახვა
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}
