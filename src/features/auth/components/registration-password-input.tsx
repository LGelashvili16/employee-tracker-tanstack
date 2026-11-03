import { useState } from 'react'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'

interface RegistrationPasswordInputProps {
  id: string
  name: string
  label: string
  value: string
  invalid: boolean
  onBlur: () => void
  onChange: (value: string) => void
}

export function RegistrationPasswordInput({
  id,
  name,
  label,
  value,
  invalid,
  onBlur,
  onChange,
}: RegistrationPasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        className="h-10 pr-11"
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder={label}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        aria-describedby={`${id}-error`}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1"
        onClick={() => setVisible((current) => !current)}
        aria-label={`${label}: ${visible ? 'დამალვა' : 'ჩვენება'}`}
        aria-pressed={visible}
      >
        {visible ? (
          <IconEyeOff aria-hidden="true" />
        ) : (
          <IconEye aria-hidden="true" />
        )}
      </Button>
    </div>
  )
}
