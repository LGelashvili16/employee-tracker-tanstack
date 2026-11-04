import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

import {
  scheduleTimezones,
  scheduleTimezoneOffset,
} from '../scheduling.timezones'

export function ScheduleTimezoneSelect({
  value,
  date,
  disabled,
  invalid,
  onChange,
  onBlur,
}: {
  value: string
  date: string
  disabled: boolean
  invalid: boolean
  onChange: (value: string) => void
  onBlur: () => void
}) {
  // Keep a previously configured valid timezone visible even if it is outside these presets.
  const options = (
    scheduleTimezones.some((option) => option.value === value)
      ? scheduleTimezones
      : [...scheduleTimezones, { value, label: value }]
  ).map((option) => ({
    ...option,
    offset: scheduleTimezoneOffset(option.value, date),
  }))
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(selected) => {
        if (selected !== null) onChange(selected)
      }}
    >
      <SelectTrigger
        id="schedule-timezone"
        className="h-10 w-full"
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby="schedule-timezone-error"
      >
        <SelectValue>
          {options.find((option) => option.value === value)?.label} (
          {scheduleTimezoneOffset(value, date)})
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              aria-label={`${option.label} (${option.offset})`}
              className="[&>span:first-child]:min-w-0 [&>span:first-child]:shrink [&>span:first-child]:whitespace-normal"
            >
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="min-w-0 break-words">{option.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {option.offset}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
