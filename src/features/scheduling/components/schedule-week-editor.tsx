import { Input } from '#/components/ui/input'
import { Switch } from '#/components/ui/switch'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '#/components/ui/field'
import { scheduleWeekdaySchema } from '../scheduling.schemas'
import type { CompanySchedule } from '../scheduling.schemas'

export const weekdayLabels = [
  'ორშაბათი',
  'სამშაბათი',
  'ოთხშაბათი',
  'ხუთშაბათი',
  'პარასკევი',
  'შაბათი',
  'კვირა',
]

export function ScheduleWeekEditor({
  days,
  onChange,
  disabled,
}: {
  days: CompanySchedule['days']
  onChange: (days: CompanySchedule['days']) => void
  disabled: boolean
}) {
  const update = (
    index: number,
    hours: CompanySchedule['days'][number]['hours'],
  ) =>
    onChange(
      days.map((day, position) =>
        position === index ? { ...day, hours } : day,
      ),
    )
  return (
    <FieldSet className="@container/week gap-0">
      <FieldLegend className="sr-only">
        კვირის სამუშაო დღეები და საათები
      </FieldLegend>
      {days.map((day, index) => {
        const label = weekdayLabels[day.weekday - 1]
        const validation = scheduleWeekdaySchema.safeParse(day)
        const errors = validation.success ? [] : validation.error.issues
        return (
          <div
            key={day.weekday}
            className="grid gap-3 border-b py-4 first:pt-0 last:border-0 last:pb-0 @min-[32rem]/week:grid-cols-[minmax(0,1fr)_16rem] @min-[32rem]/week:items-start"
          >
            <Field orientation="horizontal" className="min-h-10 gap-3">
              <Switch
                id={`working-${day.weekday}`}
                aria-labelledby={`working-label-${day.weekday}`}
                className="after:hidden"
                checked={day.hours !== null}
                disabled={disabled}
                onCheckedChange={(working) =>
                  update(
                    index,
                    working ? { start: '10:00', end: '19:00' } : null,
                  )
                }
              />
              <FieldTitle
                id={`working-label-${day.weekday}`}
                className="flex flex-col items-start gap-0.5"
              >
                <span>
                  {label}
                  <span className="sr-only">: სამუშაო დღე</span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-xs font-normal text-muted-foreground"
                >
                  {day.hours ? 'სამუშაო დღე' : 'დასვენების დღე'}
                </span>
              </FieldTitle>
            </Field>
            <FieldGroup className="grid grid-cols-2 gap-3">
              {(['start', 'end'] as const).map((part) => {
                const issues = errors.filter((error) =>
                  error.path.includes(part),
                )
                return (
                  <Field key={part} data-invalid={issues.length > 0}>
                    <FieldLabel
                      htmlFor={`${part}-${day.weekday}`}
                      className="sr-only"
                    >
                      {label}: {part === 'start' ? 'დაწყება' : 'დასრულება'}
                    </FieldLabel>
                    <Input
                      id={`${part}-${day.weekday}`}
                      type="time"
                      step={60}
                      className="h-10 tabular-nums"
                      value={day.hours?.[part] ?? ''}
                      disabled={disabled || !day.hours}
                      aria-invalid={issues.length > 0}
                      aria-describedby={`${part}-${day.weekday}-error`}
                      onChange={(event) => {
                        if (day.hours)
                          update(index, {
                            ...day.hours,
                            [part]: event.target.value,
                          })
                      }}
                    />
                    <FieldError
                      id={`${part}-${day.weekday}-error`}
                      errors={issues}
                    />
                  </Field>
                )
              })}
            </FieldGroup>
          </div>
        )
      })}
    </FieldSet>
  )
}
