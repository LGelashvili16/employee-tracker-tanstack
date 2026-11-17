import { useEffect, useRef } from 'react'
import { useForm } from '@tanstack/react-form'
import type { z } from 'zod'
import {
  securityListSchema,
  securityListFormSchema,
} from '../attendance-security.schemas'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export function DeviceFilters({
  search,
  onChange,
  showState = true,
}: {
  search: z.infer<typeof securityListSchema>
  onChange: (next: z.infer<typeof securityListSchema>) => void
  showState?: boolean
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const form = useForm({
    defaultValues: search,
    validators: {
      onSubmit: securityListFormSchema,
      onChange: securityListFormSchema,
    },
    onSubmit: ({ value }) => {
      if (timer.current) clearTimeout(timer.current)
      onChange({ ...securityListSchema.parse(value), page: 1 })
    },
  })
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    form.setFieldValue('q', search.q)
    form.setFieldValue('state', search.state)
    form.setFieldValue('sort', search.sort)
    form.setFieldValue('userId', search.userId)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [search.q, search.page, search.state, search.sort, search.userId, form])
  const stateLabels = {
    all: 'ყველა',
    pending: 'დასადასტურებელი',
    approved: 'აქტიური',
    rejected: 'უარყოფილი',
    revoked: 'გაუქმებული',
  }
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup className="flex-row flex-wrap items-end gap-3">
        <form.Field name="q">
          {(field) => (
            <Field className="min-w-56 flex-1">
              <FieldLabel htmlFor="device-search">ძიება</FieldLabel>
              <Input
                id="device-search"
                value={field.state.value}
                onChange={(event) => {
                  const q = event.target.value
                  field.handleChange(q)
                  if (timer.current) clearTimeout(timer.current)
                  timer.current = setTimeout(() => {
                    const parsed = securityListSchema.safeParse({
                      ...search,
                      q,
                      page: 1,
                    })
                    if (parsed.success) onChange(parsed.data)
                  }, 300)
                }}
                aria-describedby="device-search-error"
                onBlur={field.handleBlur}
                aria-invalid={!field.state.meta.isValid}
              />
              <FieldError
                id="device-search-error"
                errors={field.state.meta.errors}
              />
            </Field>
          )}
        </form.Field>
        {showState ? (
          <Field className="w-52">
            <FieldLabel htmlFor="device-state">სტატუსი</FieldLabel>
            <Select
              value={search.state}
              onValueChange={(state) => {
                if (timer.current) clearTimeout(timer.current)
                const next = securityListSchema.safeParse({
                  ...form.state.values,
                  state,
                  page: 1,
                })
                if (next.success) onChange(next.data)
              }}
            >
              <SelectTrigger id="device-state">
                <SelectValue>{stateLabels[search.state]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(stateLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <Field className="w-52">
          <FieldLabel htmlFor="device-sort">დალაგება</FieldLabel>
          <Select
            value={search.sort}
            onValueChange={(sort) => {
              if (timer.current) clearTimeout(timer.current)
              const next = securityListSchema.safeParse({
                ...form.state.values,
                sort,
                page: 1,
              })
              if (next.success) onChange(next.data)
            }}
          >
            <SelectTrigger id="device-sort">
              <SelectValue>
                {search.sort === 'newest' ? 'ჯერ ახალი' : 'ჯერ ძველი'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="newest">ჯერ ახალი</SelectItem>
                <SelectItem value="oldest">ჯერ ძველი</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
    </form>
  )
}
