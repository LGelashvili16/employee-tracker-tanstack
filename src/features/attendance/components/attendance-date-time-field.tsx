import { useState } from 'react'
import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import { IconCalendar } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import type { ComponentProps } from 'react'

export function AttendanceDateTimeField({
  id,
  label,
  dateLabel,
  value,
  workDate,
  fixedDate,
  disabled,
  invalid,
  errors,
  onChange,
  onBlur,
}: {
  id: string
  label: string
  dateLabel: string
  value: string
  workDate: string
  fixedDate: boolean
  disabled: boolean
  invalid: boolean
  errors: ComponentProps<typeof FieldError>['errors']
  onChange: (value: string) => void
  onBlur: () => void
}) {
  const [open, setOpen] = useState(false)
  // These are civil dates in the session timezone, not browser-local instants.
  const date = value.slice(0, 10) || workDate
  const selected = new Date(`${date}T12:00:00`)
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>
        {label} <span aria-hidden="true">*</span>
      </FieldLabel>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_7rem] gap-2">
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) onBlur()
          }}
        >
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="w-full min-w-0 justify-start"
              />
            }
            disabled={disabled}
            aria-label={dateLabel}
            aria-required="true"
            aria-invalid={invalid}
            aria-describedby={`${id}-error`}
          >
            <IconCalendar data-icon="inline-start" aria-hidden="true" />
            {format(selected, 'd MMM yyyy', { locale: ka })}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto">
            <Calendar
              mode="single"
              required
              locale={ka}
              weekStartsOn={1}
              selected={selected}
              defaultMonth={selected}
              disabled={(day) => {
                const dayDate = format(day, 'yyyy-MM-dd')
                return fixedDate ? dayDate !== workDate : dayDate < workDate
              }}
              formatters={{
                formatCaption: (month) =>
                  format(month, 'MMMM yyyy', { locale: ka }),
                formatWeekdayName: (day) =>
                  format(day, 'EEEEEE', { locale: ka }),
                formatMonthDropdown: (month) =>
                  format(month, 'MMMM', { locale: ka }),
              }}
              labels={{
                labelNext: () => 'შემდეგი თვე',
                labelPrevious: () => 'წინა თვე',
                labelNav: () => 'თვეების ნავიგაცია',
                labelGrid: (month) =>
                  format(month, 'MMMM yyyy', { locale: ka }),
                labelDayButton: (day) =>
                  format(day, 'EEEE, d MMMM yyyy', { locale: ka }),
              }}
              onSelect={(day) => {
                onChange(`${format(day, 'yyyy-MM-dd')}T${value.slice(11)}`)
                setOpen(false)
                onBlur()
              }}
            />
          </PopoverContent>
        </Popover>
        <Input
          id={id}
          type="time"
          lang="ka"
          step={60}
          value={value.slice(11)}
          required
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={`${id}-error`}
          onChange={(event) => onChange(`${date}T${event.target.value}`)}
          onBlur={onBlur}
          className="min-w-0 tabular-nums"
        />
      </div>
      <FieldError id={`${id}-error`} errors={errors} />
    </Field>
  )
}
