import { useEffect, useRef } from 'react'
import { useForm } from '@tanstack/react-form'
import { Input } from '#/components/ui/input'
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
import {
  announcementFilterSchema,
  announcementSearchSchema,
} from '../announcements.schemas'
import type { AnnouncementSearch } from '../announcements.schemas'

const statuses = {
  all: 'ყველა განცხადება',
  unread: 'წაუკითხავი',
  read: 'წაკითხული',
}
export function AnnouncementFilters({
  search,
  onChange,
}: {
  search: AnnouncementSearch
  onChange: (next: AnnouncementSearch, replace?: boolean) => void
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The debounce timer is an external resource and must be cancelled when URL navigation remounts this form.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  const form = useForm({
    defaultValues: { q: search.q },
    validators: {
      onChange: announcementFilterSchema,
      onSubmit: announcementFilterSchema,
    },
    onSubmit: ({ value }) => {
      if (timer.current) clearTimeout(timer.current)
      onChange(
        { ...search, q: value.q.trim(), page: 1, announcementId: undefined },
        true,
      )
    },
  })
  // Router search is external state: restore the field on Back/Forward and cancel superseded timers.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (form.state.values.q.trim() !== search.q) form.reset({ q: search.q })
  }, [form, search.q, search.status, search.sort, search.page])
  return (
    <form
      className="flex-1"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup className="flex flex-col gap-3 sm:flex-row">
        <form.Field name="q">
          {(field) => (
            <Field
              className="min-w-0 sm:max-w-md"
              data-invalid={!field.state.meta.isValid}
            >
              <FieldLabel htmlFor="announcements-search" className="sr-only">
                განცხადების ძიება
              </FieldLabel>
              <Input
                id="announcements-search"
                placeholder="განცხადების ძიება"
                value={field.state.value}
                onBlur={field.handleBlur}
                aria-invalid={!field.state.meta.isValid}
                aria-describedby="announcements-search-error"
                onChange={(event) => {
                  field.handleChange(event.target.value)
                  if (timer.current) clearTimeout(timer.current)
                  timer.current = setTimeout(() => {
                    void form.handleSubmit()
                  }, 300)
                }}
              />
              <FieldError
                id="announcements-search-error"
                errors={field.state.meta.errors}
              />
            </Field>
          )}
        </form.Field>
        <Field className="sm:w-48">
          <FieldLabel htmlFor="announcements-status" className="sr-only">
            წაკითხვის სტატუსი
          </FieldLabel>
          <Select
            value={search.status}
            onValueChange={(value) => {
              const parsed = announcementSearchSchema.safeParse({
                ...search,
                q: form.state.values.q,
                status: value,
                page: 1,
                announcementId: undefined,
              })
              if (parsed.success) onChange(parsed.data)
            }}
          >
            <SelectTrigger id="announcements-status">
              <SelectValue>{statuses[search.status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.entries(statuses).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
    </form>
  )
}
