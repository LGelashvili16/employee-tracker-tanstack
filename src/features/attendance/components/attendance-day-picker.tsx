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
import { attendanceWeek } from '../attendance.rules'

const civilDate = (value: string) => new Date(`${value}T12:00:00`)

/** Civil dates are supplied by the server; browser-local "today" must not choose the work date. */
export function AttendanceDayPicker({
  date,
  today,
  onChange,
  weekly = false,
}: {
  date: string
  today: string
  onChange: (date: string) => void
  weekly?: boolean
}) {
  const week = attendanceWeek(date)
  const currentWeek = attendanceWeek(today)
  const step = weekly ? 7 : 1
  const anchor = weekly ? week.start : date
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
    const selected = weekly ? attendanceWeek(value).start : value
    form.setFieldValue(
      'date',
      selected < '2000-01-01' ? '2000-01-01' : selected,
    )
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
        aria-label={weekly ? 'წინა კვირა' : 'წინა დღე'}
        disabled={anchor <= '2000-01-01'}
        onClick={() =>
          select(format(addDays(civilDate(anchor), -step), 'yyyy-MM-dd'))
        }
      >
        <IconChevronLeft aria-hidden="true" />
      </Button>
      <form.Field name="date">
        {(field) => (
          <Field
            data-invalid={!field.state.meta.isValid}
            className="w-auto min-w-0 max-w-full"
          >
            <FieldLabel htmlFor={id} className="sr-only">
              სამუშაო დღე
            </FieldLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                id={id}
                aria-label={
                  weekly ? 'სამუშაო კვირის არჩევა' : 'სამუშაო დღის არჩევა'
                }
                aria-invalid={!field.state.meta.isValid}
                aria-describedby={`${id}-error`}
                render={
                  <Button
                    type="button"
                    variant="outline"
                    depth="raised"
                    className={
                      weekly
                        ? 'h-auto min-h-8 max-w-full whitespace-normal'
                        : undefined
                    }
                  />
                }
              >
                <IconCalendar data-icon="inline-start" aria-hidden="true" />
                {weekly
                  ? `${format(civilDate(week.start), 'd MMMM yyyy', { locale: ka })} - ${format(civilDate(week.end), 'd MMMM yyyy', { locale: ka })}`
                  : format(civilDate(date), 'd MMMM yyyy', { locale: ka })}
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-0">
                <Calendar
                  mode="single"
                  weekStartsOn={1}
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
        aria-label={weekly ? 'შემდეგი კვირა' : 'შემდეგი დღე'}
        disabled={weekly ? week.start >= currentWeek.start : date >= today}
        onClick={() =>
          select(format(addDays(civilDate(anchor), step), 'yyyy-MM-dd'))
        }
      >
        <IconChevronRight aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        depth="raised"
        disabled={weekly ? week.start === currentWeek.start : date === today}
        onClick={() => select(today)}
      >
        {weekly ? 'მიმდინარე კვირა' : 'დღეს'}
      </Button>
    </form>
  )
}
