import { useForm } from '@tanstack/react-form'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { companyAttendanceQuerySchema } from '../company-attendance.schemas'

export function CompanyAttendanceSearch({
  q,
  onSearch,
}: {
  q: string
  onSearch: (q: string) => void
}) {
  const form = useForm({
    defaultValues: { q },
    validators: { onSubmit: companyAttendanceQuerySchema },
    onSubmit: ({ value }) => onSearch(value.q.trim()),
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
        <form.Field name="q">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor="attendance-user-search">
                თანამშრომლის ძიება
              </FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="attendance-user-search"
                  name="q"
                  className="sm:max-w-sm"
                  placeholder="სახელი ან თანამშრომლის კოდი"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={!field.state.meta.isValid}
                  aria-describedby="attendance-user-search-error"
                />
                <Button type="submit" variant="outline">
                  ძებნა
                </Button>
              </div>
              <FieldError
                id="attendance-user-search-error"
                errors={field.state.meta.errors}
              />
            </Field>
          )}
        </form.Field>
      </FieldGroup>
      <form.Subscribe selector={(state) => state.errors}>
        {(errors) =>
          errors.length ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              გადაამოწმეთ ძიების ველი.
            </p>
          ) : null
        }
      </form.Subscribe>
    </form>
  )
}
