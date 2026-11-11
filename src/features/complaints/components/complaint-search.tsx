import { useEffect, useEffectEvent, useRef } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import {
  complaintSearchSchema,
  complaintFilterSchema,
} from '../complaints.schemas'
import type { ComplaintSearch as Search } from '../complaints.schemas'
import { AppSelect } from '#/components/common/app-select'

const statuses = [
  { value: 'all', label: 'ყველა სტატუსი' },
  { value: 'new', label: 'ახალი' },
  { value: 'in_review', label: 'განხილვაში' },
  { value: 'resolved', label: 'მოგვარებული' },
  { value: 'closed', label: 'დახურული' },
]
const sorts = [
  { value: 'newest', label: 'ჯერ ახალი' },
  { value: 'oldest', label: 'ჯერ ძველი' },
]
const signature = (search: Search) =>
  JSON.stringify([
    search.page ?? 1,
    search.q ?? '',
    search.status ?? 'all',
    search.sort ?? 'newest',
  ])
export function ComplaintSearch({
  search,
  onChange,
}: {
  search: Search
  onChange: (next: Search, replace: boolean) => void
}) {
  const applied = signature(search)
  const previous = useRef(applied)
  const pending = useRef(new Set<string>())
  const form = useForm({
    defaultValues: {
      q: search.q ?? '',
      status: search.status ?? 'all',
      sort: search.sort ?? 'newest',
    },
    validators: {
      onChange: complaintFilterSchema,
      onSubmit: complaintFilterSchema,
    },
    onSubmit: ({ value }) => commit(value, false),
  })
  const draft = useStore(form.store, (state) => state.values)
  function commit(value: Search, replace: boolean) {
    const result = complaintSearchSchema.safeParse(value)
    if (!result.success) return
    const next = { ...search, ...result.data, page: 1 }
    const key = signature(next)
    if (key === applied || pending.current.has(key)) return
    pending.current.add(key)
    onChange(next, replace)
  }
  const debounce = useEffectEvent(() => commit(draft, true))
  useEffect(() => {
    if (previous.current === applied) return
    previous.current = applied
    if (pending.current.delete(applied)) return
    pending.current.clear()
    form.reset({
      q: search.q ?? '',
      status: search.status ?? 'all',
      sort: search.sort ?? 'newest',
    })
  }, [applied, form, search.q, search.status, search.sort])
  useEffect(() => {
    if (
      draft.q.trim() === (search.q ?? '') &&
      draft.status === (search.status ?? 'all') &&
      draft.sort === (search.sort ?? 'newest')
    )
      return
    const timer = setTimeout(debounce, 300)
    return () => clearTimeout(timer)
  }, [
    draft.q,
    draft.status,
    draft.sort,
    applied,
    search.q,
    search.status,
    search.sort,
  ])
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <form.Field name="q">
          {(field) => (
            <Field
              className="min-w-0 flex-1"
              data-invalid={!field.state.meta.isValid}
            >
              <FieldLabel htmlFor="complaint-search" className="sr-only">
                საჩივრების ძიება
              </FieldLabel>
              <Input
                id="complaint-search"
                placeholder="თემა ან თანამშრომლის სახელი"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={!field.state.meta.isValid}
                aria-describedby="complaint-search-error"
              />
              <FieldError
                id="complaint-search-error"
                errors={field.state.meta.errors}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="status">
          {(field) => (
            <Field className="w-full sm:w-48">
              <FieldLabel htmlFor="complaint-status" className="sr-only">
                საჩივრის სტატუსი
              </FieldLabel>
              <AppSelect
                id="complaint-status"
                value={field.state.value}
                items={statuses}
                onChange={(value) => {
                  const parsed =
                    complaintSearchSchema.shape.status.safeParse(value)
                  if (parsed.success && parsed.data) {
                    field.handleChange(parsed.data)
                    commit({ ...form.state.values, status: parsed.data }, false)
                  }
                }}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="sort">
          {(field) => (
            <Field className="w-full sm:w-56">
              <FieldLabel htmlFor="complaint-sort" className="sr-only">
                საჩივრების დალაგება
              </FieldLabel>
              <AppSelect
                id="complaint-sort"
                value={field.state.value}
                items={sorts}
                onChange={(value) => {
                  const parsed =
                    complaintSearchSchema.shape.sort.safeParse(value)
                  if (parsed.success && parsed.data) {
                    field.handleChange(parsed.data)
                    commit({ ...form.state.values, sort: parsed.data }, false)
                  }
                }}
              />
            </Field>
          )}
        </form.Field>
        {search.q || (search.status && search.status !== 'all') ? (
          <Button
            type="button"
            variant="outline"
            depth="raised"
            onClick={() => {
              pending.current.clear()
              form.reset({
                q: '',
                status: 'all',
                sort: search.sort ?? 'newest',
              })
              onChange(
                { ...search, page: 1, q: undefined, status: undefined },
                false,
              )
            }}
          >
            გასუფთავება
          </Button>
        ) : null}
      </FieldGroup>
    </form>
  )
}
