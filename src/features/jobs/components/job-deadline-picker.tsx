import { useState } from 'react'
import { IconCalendarDue, IconX } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '#/components/ui/popover'
import {
  formatJobDay,
  jobCalendarDate,
  jobCalendarDateString,
  jobsToday,
} from '../jobs.dates'
import { JobCalendar } from './job-calendar'

export function JobDeadlinePicker({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  describedBy,
}: {
  value: string | null
  onChange: (date: string | null) => void
  onBlur: () => void
  disabled: boolean
  invalid: boolean
  describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Moving from the trigger into its calendar is still editing the same field.
        if (!next) onBlur()
      }}
    >
      <PopoverTrigger
        id="job-deadline"
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-label={value ? `ვადა: ${formatJobDay(value)}` : 'ვადა'}
        render={
          <Button
            type="button"
            variant="outline"
            depth="raised"
            className="w-full justify-start"
          />
        }
      >
        <IconCalendarDue data-icon="inline-start" aria-hidden="true" />
        {value ? formatJobDay(value) : 'თარიღის არჩევა'}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[min(85dvh,var(--available-height))] w-auto max-w-[calc(100vw-2rem)] gap-3 overflow-y-auto p-3"
      >
        <PopoverHeader>
          <PopoverTitle>სამუშაოს ვადა</PopoverTitle>
        </PopoverHeader>
        <JobCalendar
          mode="single"
          className="[--cell-size:--spacing(10)]"
          defaultMonth={jobCalendarDate(value ?? jobsToday())}
          selected={value ? jobCalendarDate(value) : undefined}
          onSelect={(date) => {
            onChange(date ? jobCalendarDateString(date) : null)
            setOpen(false)
            onBlur()
          }}
        />
        <Button
          type="button"
          variant="outline"
          depth="raised"
          disabled={!value}
          onClick={() => {
            onChange(null)
            setOpen(false)
            onBlur()
          }}
        >
          <IconX data-icon="inline-start" aria-hidden="true" />
          ვადის გასუფთავება
        </Button>
      </PopoverContent>
    </Popover>
  )
}
