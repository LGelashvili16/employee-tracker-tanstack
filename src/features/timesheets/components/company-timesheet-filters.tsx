import { useEffect, useEffectEvent, useRef } from 'react'
import type { ReactNode } from 'react'
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
  timesheetFiltersSchema,
  timesheetSearchSchema,
} from '../timesheets.schemas'
import type { TimesheetSearch as Search } from '../timesheets.types'

const statuses = [
  { value: 'all', label: 'ყველა სტატუსი' },
  { value: 'open', label: 'მიმდინარე' },
  { value: 'pending', label: 'განხილვის მოლოდინში' },
  { value: 'rejected', label: 'უარყოფილი' },
  { value: 'approved', label: 'დადასტურებული' },
] as const
const signature = (search: Search) =>
  JSON.stringify([
    search.page ?? 0,
    search.q ?? '',
    search.status ?? 'all',
    search.sort ?? 'date-desc',
    search.month,
    search.userId,
  ])

export function CompanyTimesheetFilters({
  search,
  onChange,
  period,
  hideSearch = false,
}: {
  search: Search
  onChange: (search: Search, replace: boolean) => void
  period?: ReactNode
  hideSearch?: boolean
}) {
  const pending = useRef(new Set<string>())
  const applied = signature(search)
  const previous = useRef(applied)
  const form = useForm({
    defaultValues: { q: search.q ?? '', status: search.status ?? 'all' },
    validators: {
      onChange: timesheetFiltersSchema,
      onSubmit: timesheetFiltersSchema,
    },
    onSubmit: ({ value }) => commit(value.q, value.status, false),
  })
  const draft = useStore(form.store, (state) => state.values)
  function commit(q: string, status: string, replace: boolean) {
    const parsed = timesheetFiltersSchema.safeParse({ q, status })
    if (!parsed.success) return
    const next = {
      ...search,
      ...parsed.data,
      q: parsed.data.q || undefined,
      status: parsed.data.status === 'all' ? undefined : parsed.data.status,
      page: 0,
    }
    const nextKey = signature(next)
    if (nextKey === applied || pending.current.has(nextKey)) return
    pending.current.add(nextKey)
    onChange(next, replace)
  }
  const applyDebounced = useEffectEvent(() =>
    commit(draft.q, draft.status, true),
  )
  useEffect(() => {
    if (previous.current === applied) return
    previous.current = applied
    // Own URL commits keep a newer draft intact; Back/Forward or other navigation restores URL state.
    if (pending.current.delete(applied)) return
    pending.current.clear()
    form.reset({ q: search.q ?? '', status: search.status ?? 'all' })
  }, [applied, form, search.q, search.status])
  useEffect(() => {
    // Debounce URL navigation while keeping the focused form mounted.
    if (
      draft.q.trim() === (search.q ?? '') &&
      draft.status === (search.status ?? 'all')
    )
      return
    const timer = setTimeout(applyDebounced, 300)
    return () => clearTimeout(timer)
  }, [draft.q, draft.status, applied, search.q, search.status])

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      className="min-w-0 flex-1"
    >
      <FieldGroup className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        {!hideSearch ? (
          <form.Field name="q">
            {(field) => (
              <Field
                className="min-w-0 flex-1 sm:max-w-md"
                data-invalid={!field.state.meta.isValid}
              >
                <FieldLabel htmlFor="timesheet-user-search" className="sr-only">
                  თანამშრომლის ძიება
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <IconSearch aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="timesheet-user-search"
                    name="q"
                    placeholder="სახელი ან მომხმარებლის სახელი"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key !== 'Enter' ||
                        event.nativeEvent.isComposing
                      )
                        return
                      event.preventDefault()
                      void form.handleSubmit()
                    }}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="timesheet-user-search-error"
                  />
                </InputGroup>
                <FieldError
                  id="timesheet-user-search-error"
                  errors={field.state.meta.errors}
                />
              </Field>
            )}
          </form.Field>
        ) : null}
        <form.Field name="status">
          {(field) => (
            <Field
              className="w-full sm:w-48"
              data-invalid={!field.state.meta.isValid}
            >
              <FieldLabel htmlFor="timesheet-status" className="sr-only">
                დღის სტატუსი
              </FieldLabel>
              <Select
                value={field.state.value}
                items={statuses}
                onValueChange={(value) => {
                  const parsed =
                    timesheetSearchSchema.shape.status.safeParse(value)
                  if (!parsed.success || !parsed.data) return
                  field.handleChange(parsed.data)
                  commit(form.getFieldValue('q'), parsed.data, false)
                }}
              >
                <SelectTrigger
                  id="timesheet-status"
                  className="w-full shadow-control-raised active:shadow-control-pressed"
                  aria-label="დღის სტატუსი"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {statuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        {period}
        {search.q || (search.status && search.status !== 'all') ? (
          <Button
            type="button"
            variant="outline"
            depth="raised"
            onClick={() => {
              pending.current.clear()
              form.reset({ q: '', status: 'all' })
              onChange(
                { ...search, q: undefined, status: undefined, page: 0 },
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
