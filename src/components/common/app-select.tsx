import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export function AppSelect({
  id,
  value,
  items,
  disabled,
  invalid,
  onChange,
  onBlur,
  required,
}: {
  id: string
  value: string
  items: Array<{ value: string; label: string }>
  disabled?: boolean
  invalid?: boolean
  onChange: (value: string) => void
  onBlur?: () => void
  required?: boolean
}) {
  return (
    <Select
      required={required}
      value={value}
      items={items}
      onValueChange={(next) => {
        if (next !== null) onChange(next)
      }}
      disabled={disabled}
      onOpenChange={(open) => {
        if (!open) onBlur?.()
      }}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalid}
        aria-describedby={`${id}-error`}
        className="w-full shadow-control-raised active:shadow-control-pressed"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
