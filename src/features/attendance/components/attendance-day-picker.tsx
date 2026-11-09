import { useEffect, useId, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { addDays, format } from 'date-fns'
import { ka } from 'date-fns/locale'
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { attendanceDayFormSchema } from '../company-attendance.schemas'

const civilDate = (value: string) => new Date(`${value}T12:00:00`)

/** Civil dates are supplied by the server; browser-local "today" must not choose the work date. */
export function AttendanceDayPicker({
  date,
  today,
  onChange,
}: {
  date: string
  today: string
  onChange: (date: string) => void
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const form = useForm({
    defaultValues: { date },
    validators: {
      onChange: attendanceDayFormSchema,
      onSubmit: attendanceDayFormSchema,
    },
    onSubmit: ({ value }) => onChange(value.date),
  })
  useEffect(() => {
    form.reset({ date })
  }, [date, form])
  function select(value: string) {
    form.setFieldValue('date', value)
    void form.handleSubmit()
    setOpen(false)
  }
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
      className="flex flex-wrap items-start gap-2"
    >
      <Button
        type="button"
        variant="outline"
        depth="raised"
        size="icon"
        aria-label="წინა დღე"
        disabled={date <= '2000-01-01'}
        onClick={() =>
          select(format(addDays(civilDate(date), -1), 'yyyy-MM-dd'))
        }
      >
        <IconChevronLeft aria-hidden="true" />
      </Button>
      <form.Field name="date">
        {(field) => (
          <Field data-invalid={!field.state.meta.isValid} className="w-auto">
            <FieldLabel htmlFor={id} className="sr-only">
              სამუშაო დღე
            </FieldLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                id={id}
                aria-label="სამუშაო დღის არჩევა"
                aria-invalid={!field.state.meta.isValid}
                aria-describedby={`${id}-error`}
                render={
                  <Button type="button" variant="outline" depth="raised" />
                }
              >
                <IconCalendar data-icon="inline-start" aria-hidden="true" />
                {format(civilDate(date), 'd MMMM yyyy', { locale: ka })}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-0">
                <Calendar
                  mode="single"
                  locale={ka}
                  className="w-full"
                  selected={civilDate(date)}
                  defaultMonth={civilDate(date)}
                  today={civilDate(today)}
                  startMonth={new Date(2000, 0, 1)}
                  endMonth={civilDate(today)}
                  disabled={[
                    { before: new Date(2000, 0, 1) },
                    { after: civilDate(today) },
                  ]}
                  formatters={{
                    formatCaption: (day) =>
                      format(day, 'LLLL yyyy', { locale: ka }),
                    formatWeekdayName: (day) =>
                      format(day, 'EEEEEE', { locale: ka }),
                  }}
                  labels={{
                    labelNext: () => 'შემდეგი თვე',
                    labelPrevious: () => 'წინა თვე',
                    labelNav: () => 'თვეების ნავიგაცია',
                    labelGrid: (day) =>
                      format(day, 'LLLL yyyy', { locale: ka }),
                    labelDayButton: (day) =>
                      format(day, 'EEEE, d MMMM yyyy', { locale: ka }),
                  }}
                  onSelect={(day) => {
                    if (day) select(format(day, 'yyyy-MM-dd'))
                  }}
                />
              </PopoverContent>
            </Popover>
            <FieldError id={`${id}-error`} errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <Button
        type="button"
        variant="outline"
        depth="raised"
        size="icon"
        aria-label="შემდეგი დღე"
        disabled={date >= today}
        onClick={() =>
          select(format(addDays(civilDate(date), 1), 'yyyy-MM-dd'))
        }
      >
        <IconChevronRight aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        depth="raised"
        disabled={date === today}
        onClick={() => select(today)}
      >
        დღეს
      </Button>
    </form>
  )
}
