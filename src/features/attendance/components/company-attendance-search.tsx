import { useEffect, useEffectEvent, useRef } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { IconSearch, IconX } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'
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
  companyAttendanceQuerySchema,
  companyAttendanceSearchSchema,
} from '../company-attendance.schemas'
import type { CompanyAttendanceSearch as Search } from '../company-attendance.types'

const states = [
  { value: 'all', label: 'ყველა სტატუსი' },
  { value: 'active', label: 'აქტიური' },
  { value: 'invited', label: 'გასააქტიურებელი' },
  { value: 'suspended', label: 'შეჩერებული' },
] as const
const signature = (search: Search) =>
  JSON.stringify([
    search.page ?? 1,
    search.q ?? '',
    search.state ?? 'all',
    search.sort ?? 'name-asc',
  ])

export function CompanyAttendanceSearch({
  search,
  onChange,
}: {
  search: Search
  onChange: (search: Search, replace: boolean) => void
}) {
  const pending = useRef(new Set<string>())
  const applied = signature(search)
  const previous = useRef(applied)
  const form = useForm({
    defaultValues: { q: search.q ?? '', state: search.state ?? 'all' },
    validators: {
      onChange: companyAttendanceQuerySchema,
      onSubmit: companyAttendanceQuerySchema,
    },
    onSubmit: ({ value }) => commit(value.q, value.state, false),
  })
  const draft = useStore(form.store, (state) => state.values)
  function commit(q: string, state: string, replace: boolean) {
    const parsed = companyAttendanceQuerySchema.safeParse({ q, state })
    if (!parsed.success) return
    const next = {
      ...search,
      ...parsed.data,
      q: parsed.data.q || undefined,
      state: parsed.data.state === 'all' ? undefined : parsed.data.state,
      page: 1,
    }
    const nextKey = signature(next)
    if (nextKey === applied || pending.current.has(nextKey)) return
    pending.current.add(nextKey)
    onChange(next, replace)
  }
  const applyDebounced = useEffectEvent(() =>
    commit(draft.q, draft.state, true),
  )
  useEffect(() => {
    if (previous.current === applied) return
    previous.current = applied
    // Own URL commits keep a newer draft intact; Back/Forward or other navigation restores URL state.
    if (pending.current.delete(applied)) return
    pending.current.clear()
    form.reset({ q: search.q ?? '', state: search.state ?? 'all' })
  }, [applied, form, search.q, search.state])
  useEffect(() => {
    if (
      draft.q.trim() === (search.q ?? '') &&
      draft.state === (search.state ?? 'all')
    )
      return
    const timer = setTimeout(applyDebounced, 300)
    return () => clearTimeout(timer)
  }, [draft.q, draft.state, applied, search.q, search.state])

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      className="min-w-0 flex-1"
    >
      <FieldGroup className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <form.Field name="q">
          {(field) => (
            <Field
              className="min-w-0 flex-1 sm:max-w-md"
              data-invalid={!field.state.meta.isValid}
            >
              <FieldLabel htmlFor="attendance-user-search" className="sr-only">
                თანამშრომლის ძიება
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <IconSearch aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  id="attendance-user-search"
                  name="q"
                  placeholder="სახელი ან მომხმარებლის სახელი"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.nativeEvent.isComposing)
                      return
                    event.preventDefault()
                    void form.handleSubmit()
                  }}
                  aria-invalid={!field.state.meta.isValid}
                  aria-describedby="attendance-user-search-error"
                />
              </InputGroup>
              <FieldError
                id="attendance-user-search-error"
                errors={field.state.meta.errors}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="state">
          {(field) => (
            <Field
              className="w-full sm:w-48"
              data-invalid={!field.state.meta.isValid}
            >
              <FieldLabel htmlFor="attendance-state" className="sr-only">
                ანგარიშის სტატუსი
              </FieldLabel>
              <Select
                value={field.state.value}
                items={states}
                onValueChange={(value) => {
                  const parsed =
                    companyAttendanceSearchSchema.shape.state.safeParse(value)
                  if (!parsed.success || !parsed.data) return
                  field.handleChange(parsed.data)
                  commit(form.getFieldValue('q'), parsed.data, false)
                }}
              >
                <SelectTrigger
                  id="attendance-state"
                  className="w-full shadow-control-raised active:shadow-control-pressed"
                  aria-label="ანგარიშის სტატუსი"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {states.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        {search.q || (search.state && search.state !== 'all') ? (
          <Button
            type="button"
            variant="outline"
            depth="raised"
            onClick={() => {
              pending.current.clear()
              form.reset({ q: '', state: 'all' })
              onChange(
                { ...search, q: undefined, state: undefined, page: 1 },
                false,
              )
            }}
          >
            <IconX data-icon="inline-start" aria-hidden="true" />
            გასუფთავება
          </Button>
        ) : null}
      </FieldGroup>
      <form.Subscribe selector={(state) => state.errors}>
        {(errors) =>
          errors.length ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              გადაამოწმეთ ფილტრები.
            </p>
          ) : null
        }
      </form.Subscribe>
    </form>
  )
}
