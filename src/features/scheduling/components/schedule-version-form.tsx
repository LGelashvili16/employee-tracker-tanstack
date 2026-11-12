import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Spinner } from '#/components/ui/spinner'
import { toast } from 'sonner'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { createScheduleVersion } from '../scheduling.functions'
import { scheduleSettingsKey } from '../scheduling.queries'
import { saveCompanyScheduleSchema } from '../scheduling.schemas'
import { ScheduleWeekEditor } from './schedule-week-editor'
import { ScheduleDateInput } from './schedule-date-input'
import { ScheduleTimezoneSelect } from './schedule-timezone-select'
import {
  IconCalendarWeek,
  IconBell,
  IconCalendarClock,
} from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import type { ScheduleSettings } from '../scheduling.types'
import type { SaveCompanyScheduleInput } from '../scheduling.schemas'

const fields = [
  { name: 'effectiveFrom', label: 'ძალაში შესვლის თარიღი', type: 'date' },
  { name: 'timezone', label: 'კომპანიის დროის სარტყელი', type: 'text' },
  {
    name: 'reminderMinutesBefore',
    label: 'შესვლის შეხსენება დაწყებამდე (წუთი)',
    type: 'number',
  },
  {
    name: 'checkoutReminderMinutesBefore',
    label: 'გასვლის შეხსენება დასრულებამდე (წუთი)',
    type: 'number',
  },
] as const

export function ScheduleVersionForm({
  settings,
  actorId,
}: {
  settings: ScheduleSettings
  actorId: string
}) {
  const client = useQueryClient()
  const save = useServerFn(createScheduleVersion)
  const [saved, setSaved] = useState(false)
  const mutation = useMutation({
    mutationFn: (data: SaveCompanyScheduleInput) => save({ data }),
    retry: false,
  })
  const defaults: SaveCompanyScheduleInput = {
    effectiveFrom: settings.minimumEffectiveFrom,
    timezone: settings.timezone ?? 'Asia/Tbilisi',
    lateGraceMinutes: 0,
    earlyDepartureGraceMinutes: 0,
    reminderMinutesBefore: settings.latest?.reminderMinutesBefore ?? 5,
    checkoutReminderMinutesBefore:
      settings.latest?.checkoutReminderMinutesBefore ?? 0,
    days:
      settings.latest?.days ??
      Array.from({ length: 7 }, (_, index) => ({
        weekday: index + 1,
        hours: null,
      })),
  }
  const form = useForm({
    defaultValues: defaults,
    validators: { onSubmit: saveCompanyScheduleSchema },
    onSubmit: async ({ value }) => {
      const result = await mutation.mutateAsync(value).catch(() => null)
      if (!result) {
        toast.error(
          'მოთხოვნა ვერ დასრულდა. გადაამოწმეთ შენახული განრიგი ხელახლა გაგზავნამდე.',
        )
        return
      }
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      // Report the confirmed save separately from cache refresh, which can fail independently.
      setSaved(true)
      toast.success('განრიგი შენახულია.', {
        description: `ძალაში შესვლის თარიღი: ${result.value.effectiveFrom}.`,
      })
      await client.invalidateQueries({ queryKey: scheduleSettingsKey(actorId) })
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
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => {
          const disabled = pending || saved
          return (
            <FieldGroup className="gap-6">
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <form.Field name="days">
                  {(field) => (
                    <Card>
                      <CardHeader className="border-b">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <CardTitle className="flex items-center gap-2">
                            <IconCalendarWeek
                              className="size-5 text-muted-foreground"
                              aria-hidden="true"
                            />
                            სამუშაო კვირა
                          </CardTitle>
                          <Badge variant="secondary">
                            {
                              field.state.value.filter(
                                (day) => day.hours !== null,
                              ).length
                            }{' '}
                            სამუშაო დღე
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScheduleWeekEditor
                          days={field.state.value}
                          onChange={field.handleChange}
                          disabled={disabled}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </CardContent>
                    </Card>
                  )}
                </form.Field>
                <FieldGroup className="gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconCalendarClock
                          className="size-5 text-muted-foreground"
                          aria-hidden="true"
                        />
                        მოქმედების პერიოდი
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderFields(disabled, ['effectiveFrom', 'timezone'])}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconBell
                          className="size-5 text-muted-foreground"
                          aria-hidden="true"
                        />
                        შეხსენებები
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderFields(disabled, [
                        'reminderMinutesBefore',
                        'checkoutReminderMinutesBefore',
                      ])}
                    </CardContent>
                  </Card>
                </FieldGroup>
              </div>
              <footer className="flex justify-end">
                <Button
                  type="submit"
                  className="relative min-h-10 px-10"
                  disabled={disabled}
                  aria-busy={pending}
                >
                  {pending ? (
                    <Spinner className="absolute left-4" aria-hidden="true" />
                  ) : null}
                  განრიგის შენახვა
                </Button>
              </footer>
            </FieldGroup>
          )
        }}
      </form.Subscribe>
    </form>
  )

  function renderFields(
    disabled: boolean,
    names: ReadonlyArray<(typeof fields)[number]['name']>,
  ) {
    return (
      <FieldGroup>
        {fields
          .filter((item) => names.includes(item.name))
          .map(({ name, label, type }) => (
            <form.Field key={name} name={name}>
              {(field) => (
                <Field data-invalid={!field.state.meta.isValid}>
                  <FieldLabel htmlFor={`schedule-${name}`}>{label}</FieldLabel>
                  {name === 'effectiveFrom' ? (
                    <ScheduleDateInput
                      value={String(field.state.value)}
                      minimum={settings.minimumEffectiveFrom}
                      disabled={disabled}
                      invalid={!field.state.meta.isValid}
                      onBlur={field.handleBlur}
                      onChange={field.handleChange}
                    />
                  ) : name === 'timezone' ? (
                    <form.Subscribe
                      selector={(state) => state.values.effectiveFrom}
                    >
                      {(date) => (
                        <ScheduleTimezoneSelect
                          value={String(field.state.value)}
                          date={date}
                          disabled={disabled || settings.timezone !== null}
                          invalid={!field.state.meta.isValid}
                          onBlur={field.handleBlur}
                          onChange={field.handleChange}
                        />
                      )}
                    </form.Subscribe>
                  ) : (
                    <Input
                      id={`schedule-${name}`}
                      type={type}
                      className="h-10"
                      value={field.state.value ?? ''}
                      disabled={disabled}
                      min={0}
                      max={60}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.valueAsNumber)
                      }
                      aria-invalid={!field.state.meta.isValid}
                      aria-describedby={`schedule-${name}-error`}
                    />
                  )}
                  <FieldError
                    id={`schedule-${name}-error`}
                    errors={field.state.meta.errors}
                  />
                </Field>
              )}
            </form.Field>
          ))}
      </FieldGroup>
    )
  }
}
