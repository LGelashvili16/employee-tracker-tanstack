import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { gpsSearchText } from '../gps.schemas'
import type { GpsSearch } from '../gps.schemas'

const searchFormSchema = z.object({ q: gpsSearchText })

export function GpsDeviceSearch({
  search,
  onSearch,
}: {
  search: GpsSearch
  onSearch: (search: GpsSearch, replace?: boolean) => void
}) {
  const form = useForm({
    defaultValues: { q: search.q },
    validators: { onChange: searchFormSchema },
  })
  useEffect(() => {
    form.reset({ q: search.q })
  }, [form, search.q])
  return (
    <form.Field name="q">
      {(field) => (
        <SearchInput
          value={field.state.value}
          onValue={field.handleChange}
          errors={field.state.meta.errors}
          onCommit={(q) => {
            if (q !== search.q) onSearch({ q }, true)
          }}
        />
      )}
    </form.Field>
  )
}

function SearchInput({
  value,
  onValue,
  onCommit,
  errors,
}: {
  value: string
  onValue: (value: string) => void
  onCommit: (value: string) => void
  errors: Array<{ message: string } | undefined>
}) {
  useEffect(() => {
    const parsed = gpsSearchText.safeParse(value)
    if (!parsed.success) return
    const timer = setTimeout(() => onCommit(parsed.data), 300)
    return () => clearTimeout(timer)
  }, [value, onCommit])
  return (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="gps-search">მოწყობილობის ძიება</FieldLabel>
      <Input
        id="gps-search"
        value={value}
        onChange={(e) => onValue(e.target.value)}
        maxLength={80}
        aria-invalid={errors.length > 0}
      />
      <FieldError errors={errors} />
    </Field>
  )
}
