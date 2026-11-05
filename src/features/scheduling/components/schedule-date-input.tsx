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

export function ScheduleDateInput({
  value,
  minimum,
  disabled,
  invalid,
  onChange,
  onBlur,
}: {
  value: string
  minimum: string
  disabled: boolean
  invalid: boolean
  onChange: (value: string) => void
  onBlur: () => void
}) {
  const [open, setOpen] = useState(false)
  const selected = new Date(`${value}T12:00:00`)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="h-10 w-full justify-between" />
        }
        id="schedule-effectiveFrom"
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby="schedule-effectiveFrom-error"
        onBlur={onBlur}
      >
        {format(selected, 'd MMMM yyyy', { locale: ka })}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <Calendar
          mode="single"
          locale={ka}
          selected={selected}
          defaultMonth={selected}
          disabled={{ before: new Date(`${minimum}T00:00:00`) }}
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
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
