import { useState } from 'react'
import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { formatLeaveDate } from '../leave.presentation'

export function LeaveDateInput({
  id,
  value,
  disabled,
  invalid,
  onChange,
  onBlur,
}: {
  id: string
  value: string
  disabled: boolean
  invalid: boolean
  onChange: (value: string) => void
  onBlur: () => void
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T12:00:00`) : undefined
  return (
    // Moving focus into the calendar stays inside this composite field. Mark it blurred only when the picker closes.
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
            depth="raised"
            className="w-full justify-start"
          />
        }
        id={id}
        disabled={disabled}
        aria-required="true"
        aria-invalid={invalid}
        aria-describedby={`${id}-error`}
      >
        {value ? formatLeaveDate(value) : 'აირჩიეთ თარიღი'}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <Calendar
          mode="single"
          locale={ka}
          selected={selected}
          defaultMonth={selected}
          formatters={{
            formatCaption: (month) =>
              format(month, 'MMMM yyyy', { locale: ka }),
            formatWeekdayName: (day) => format(day, 'EEEEEE', { locale: ka }),
            formatMonthDropdown: (month) =>
              format(month, 'MMMM', { locale: ka }),
          }}
          labels={{
            labelNext: () => 'შემდეგი თვე',
            labelPrevious: () => 'წინა თვე',
            labelNav: () => 'თვეების ნავიგაცია',
            labelGrid: (month) => format(month, 'MMMM yyyy', { locale: ka }),
            labelDayButton: (day) =>
              format(day, 'EEEE, d MMMM yyyy', { locale: ka }),
          }}
          onSelect={(day) => {
            if (day) {
              onChange(format(day, 'yyyy-MM-dd'))
              setOpen(false)
              onBlur()
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
