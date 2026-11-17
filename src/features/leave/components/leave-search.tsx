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
import { leaveSearchSchema, leaveFilterSchema } from '../leave.schemas'
import type { LeaveSearch as Search } from '../leave.schemas'
import { LeaveSelect } from './leave-select'

const statuses = [
  { value: 'all', label: 'ყველა სტატუსი' },
  { value: 'pending', label: 'მოლოდინში' },
  { value: 'approved', label: 'დამტკიცებული' },
  { value: 'rejected', label: 'უარყოფილი' },
  { value: 'cancelled', label: 'გაუქმებული' },
]
const sorts = [
  { value: 'newest', label: 'ჯერ ახალი' },
  { value: 'oldest', label: 'ჯერ ძველი' },
  { value: 'date-asc', label: 'დაწყების ზრდადობით' },
  { value: 'date-desc', label: 'დაწყების კლებადობით' },
]
const signature = (search: Search) =>
  JSON.stringify([
    search.page ?? 1,
    search.q ?? '',
    search.status ?? 'all',
    search.sort ?? 'newest',
    search.requestId ?? '',
  ])
export function LeaveSearch({
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
      onChange: leaveFilterSchema,
      onSubmit: leaveFilterSchema,
    },
    onSubmit: ({ value }) => commit(value, false),
  })
  const draft = useStore(form.store, (state) => state.values)
  function commit(value: Search, replace: boolean) {
    const result = leaveSearchSchema.safeParse(value)
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
              <FieldLabel htmlFor="leave-search" className="sr-only">
                მოთხოვნების ძიება
              </FieldLabel>
              <Input
                id="leave-search"
                placeholder="სახელი ან კომენტარი"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={!field.state.meta.isValid}
                aria-describedby="leave-search-error"
              />
              <FieldError
                id="leave-search-error"
                errors={field.state.meta.errors}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="status">
          {(field) => (
            <Field className="w-full sm:w-48">
              <FieldLabel htmlFor="leave-status" className="sr-only">
                მოთხოვნის სტატუსი
              </FieldLabel>
              <LeaveSelect
                id="leave-status"
                value={field.state.value}
                items={statuses}
                onChange={(value) => {
                  const parsed = leaveSearchSchema.shape.status.safeParse(value)
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
              <FieldLabel htmlFor="leave-sort" className="sr-only">
                მოთხოვნების დალაგება
              </FieldLabel>
              <LeaveSelect
                id="leave-sort"
                value={field.state.value}
                items={sorts}
                onChange={(value) => {
                  const parsed = leaveSearchSchema.shape.sort.safeParse(value)
                  if (parsed.success && parsed.data) {
                    field.handleChange(parsed.data)
                    commit({ ...form.state.values, sort: parsed.data }, false)
                  }
                }}
              />
            </Field>
          )}
        </form.Field>
        {search.requestId ? (
          <Button
            type="button"
            variant="outline"
            depth="raised"
            onClick={() => {
              pending.current.clear()
              form.reset({
                q: search.q ?? '',
                status: search.status ?? 'all',
                sort: search.sort ?? 'newest',
              })
              onChange({ ...search, requestId: undefined, page: 1 }, false)
            }}
          >
            ყველა მოთხოვნა
          </Button>
        ) : null}
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
