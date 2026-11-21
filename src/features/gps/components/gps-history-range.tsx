import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { format, parseISO } from 'date-fns'
import { ka } from 'date-fns/locale'
import { IconCalendar } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Field, FieldError } from '#/components/ui/field'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '#/components/ui/popover'
import { formatGeorgianDate } from '#/lib/date-format'
import { gpsHistoryRange } from '../gps.schemas'
import type { z } from 'zod'

type Range = z.output<typeof gpsHistoryRange>

export function GpsHistoryRange({
  value,
  onChange,
}: {
  value: Range
  onChange: (range: Range) => void
}) {
  const [open, setOpen] = useState(false)
  const [selectingEnd, setSelectingEnd] = useState(false)
  const form = useForm({
    defaultValues: { from: value.from, to: value.to },
    validators: { onSubmit: gpsHistoryRange },
    onSubmit: ({ value: range }) => {
      onChange(range)
      setOpen(false)
    },
  })
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          form.reset({ from: value.from, to: value.to })
          setSelectingEnd(false)
        }
        setOpen(next)
      }}
    >
      <PopoverTrigger render={<Button variant="outline" depth="raised" />}>
        <IconCalendar aria-hidden="true" />
        {formatGeorgianDate(value.from)}
        {value.to !== value.from && ` - ${formatGeorgianDate(value.to)}`}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto max-w-[calc(100vw-2rem)] p-3"
      >
        <PopoverHeader>
          <PopoverTitle>პერიოდი თბილისის დროით</PopoverTitle>
          <PopoverDescription>აირჩიეთ მაქსიმუმ შვიდი დღე.</PopoverDescription>
        </PopoverHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.Field name="to">
            {(field) => (
              <Field>
                <form.Subscribe selector={(state) => state.values}>
                  {(range) => (
                    <Calendar
                      mode="range"
                      resetOnSelect
                      required
                      defaultMonth={parseISO(value.from)}
                      locale={ka}
                      labels={{
                        labelNav: () => 'კალენდრის ნავიგაცია',
                        labelNext: () => 'შემდეგი თვე',
                        labelPrevious: () => 'წინა თვე',
                        labelGrid: (date) =>
                          format(date, 'LLLL yyyy', { locale: ka }),
                        labelDayButton: (date) =>
                          format(date, 'd MMMM yyyy', { locale: ka }),
                      }}
                      selected={{
                        from: range.from ? parseISO(range.from) : undefined,
                        to: selectingEnd ? undefined : parseISO(range.to),
                      }}
                      onSelect={(selected, day) => {
                        // A single selected day is also a valid history range.
                        const start = selected.from ?? day
                        setSelectingEnd(!selected.to)
                        form.setFieldValue('from', format(start, 'yyyy-MM-dd'))
                        field.handleChange(
                          format(selected.to ?? start, 'yyyy-MM-dd'),
                        )
                      }}
                    />
                  )}
                </form.Subscribe>
                <FieldError errors={field.state.meta.errors} />
                <Button type="submit" className="w-full">
                  პერიოდის გამოყენება
                </Button>
              </Field>
            )}
          </form.Field>
        </form>
      </PopoverContent>
    </Popover>
  )
}
