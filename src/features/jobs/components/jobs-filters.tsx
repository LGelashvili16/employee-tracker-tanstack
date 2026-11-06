import { useEffect, useEffectEvent, useRef } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { IconSearch, IconX } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  jobFilterSchema,
  jobKindSchema,
  jobStatusSchema,
} from '../jobs.schemas'
import { jobKinds, jobStatuses } from '../jobs.presentation'
import { jobsMonthRange } from '../jobs.dates'
import { JobsDateRange } from './jobs-date-range'
import type { JobSearch } from '../jobs.types'
import type { z } from 'zod'

type Filters = z.infer<typeof jobFilterSchema>
const signature = (search: JobSearch) =>
  JSON.stringify([
    search.q,
    search.status,
    search.kind,
    search.scope,
    search.sort,
    search.page,
    search.from,
    search.to,
  ])
const filterFields = [
  {
    name: 'status',
    label: 'სამუშაოს სტატუსი',
    options: [
      { value: 'all', label: 'ყველა სტატუსი' },
      ...jobStatusSchema.options.map((value) => ({
        value,
        label: jobStatuses[value].label,
      })),
    ],
  },
  {
    name: 'kind',
    label: 'სამუშაოს ტიპი',
    options: [
      { value: 'all', label: 'ყველა ტიპი' },
      ...jobKindSchema.options.map((value) => ({
        value,
        label: jobKinds[value].label,
      })),
    ],
  },
  {
    name: 'scope',
    label: 'პასუხისმგებელი',
    options: [
      { value: 'all', label: 'ყველა სამუშაო' },
      { value: 'mine', label: 'ჩემი სამუშაოები' },
    ],
  },
  {
    name: 'sort',
    label: 'დალაგება',
    options: [
      { value: 'newest', label: 'ჯერ ახალი' },
      { value: 'oldest', label: 'ჯერ ძველი' },
      { value: 'title', label: 'სათაურით' },
    ],
  },
] as const
export function JobsFilters({
  search,
  onChange,
  showSearch = true,
}: {
  search: JobSearch
  onChange: (search: JobSearch, replace?: boolean) => void
  showSearch?: boolean
}) {
  const applied = signature(search)
  const previous = useRef(applied)
  const pending = useRef(new Set<string>())
  const form = useForm({
    defaultValues: {
      from: search.from,
      to: search.to,
      q: search.q,
      status: search.status,
      kind: search.kind,
      scope: search.scope,
      sort: search.sort,
    },
    validators: { onChange: jobFilterSchema, onSubmit: jobFilterSchema },
    onSubmit: ({ value }) => commit(value, false),
  })
  const draft = useStore(form.store, (state) => state.values)
  function commit(value: Filters, replace: boolean) {
    const parsed = jobFilterSchema.safeParse(value)
    if (!parsed.success) return
    const next = { ...search, ...parsed.data, page: 1, pin: undefined }
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
      from: search.from,
      to: search.to,
      q: search.q,
      status: search.status,
      kind: search.kind,
      scope: search.scope,
      sort: search.sort,
    })
  }, [
    applied,
    form,
    search.q,
    search.status,
    search.kind,
    search.scope,
    search.sort,
    search.from,
    search.to,
  ])
  useEffect(() => {
    if (draft.q.trim() === search.q) return
    const timer = setTimeout(debounce, 300)
    return () => clearTimeout(timer)
  }, [draft.q, applied, search.q])
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup className="flex flex-row flex-wrap items-start gap-3">
        <Field className="w-full sm:w-auto">
          <JobsDateRange
            key={`${search.from}:${search.to}`}
            value={{ from: search.from, to: search.to }}
            onChange={(range) => {
              form.setFieldValue('from', range.from)
              form.setFieldValue('to', range.to)
              commit({ ...form.state.values, ...range }, false)
            }}
          />
        </Field>
        {showSearch ? (
          <form.Field name="q">
            {(field) => (
              <Field
                className="min-w-48 flex-1"
                data-invalid={!field.state.meta.isValid}
              >
                <FieldLabel className="sr-only" htmlFor="jobs-search">
                  სამუშაოს ძიება
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <IconSearch aria-hidden="true" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="jobs-search"
                    placeholder="სამუშაოს სათაური, შენახული მისამართი ან შენიშვნა"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby={
                      field.state.meta.errors.length
                        ? 'jobs-search-error'
                        : undefined
                    }
                  />
                </InputGroup>
                <FieldError
                  id="jobs-search-error"
                  errors={field.state.meta.errors}
                />
              </Field>
            )}
          </form.Field>
        ) : null}
        {filterFields.map(({ name, label, options }) => (
          <form.Field key={name} name={name}>
            {(field) => (
              <Field className="w-full min-w-36 flex-1 sm:w-auto sm:flex-none">
                <FieldLabel className="sr-only" htmlFor={`jobs-filter-${name}`}>
                  {label}
                </FieldLabel>
                <Select
                  value={field.state.value}
                  items={options}
                  onValueChange={(value) => {
                    const parsed = jobFilterSchema.shape[name].safeParse(value)
                    if (!parsed.success) return
                    field.handleChange(parsed.data)
                    commit({ ...form.state.values, [name]: parsed.data }, false)
                  }}
                >
                  <SelectTrigger
                    id={`jobs-filter-${name}`}
                    className="w-full shadow-control-raised active:shadow-control-pressed"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        ))}
        <Button
          type="button"
          variant="outline"
          depth="raised"
          aria-label="ფილტრების გასუფთავება"
          title="ფილტრების გასუფთავება"
          onClick={() => {
            const defaults: Filters = {
              ...jobsMonthRange(),
              q: '',
              status: 'all',
              kind: 'all',
              scope: 'all',
              sort: 'newest',
            }
            pending.current.clear()
            form.reset(defaults)
            onChange({ ...search, ...defaults, page: 1, pin: undefined })
          }}
        >
          <IconX aria-hidden="true" />
          <span className="sm:sr-only">გასუფთავება</span>
        </Button>
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
