import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '#/components/ui/field'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  accentPalettes,
} from '#/lib/appearance'
import { accentIdSchema, appearanceSchema } from '../appearance.schemas'

export function AppearanceSettings() {
  const form = useForm({
    defaultValues: { accent: DEFAULT_ACCENT },
    validators: { onChange: appearanceSchema },
  })

  useEffect(() => {
    // Read the already restored DOM value after hydration, keeping SSR deterministic.
    const sync = () => {
      const result = accentIdSchema.safeParse(
        document.documentElement.dataset.accent,
      )
      form.setFieldValue(
        'accent',
        result.success ? result.data : DEFAULT_ACCENT,
      )
    }
    sync()
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACCENT_STORAGE_KEY && event.key !== null) return
      const result = accentIdSchema.safeParse(event.newValue)
      document.documentElement.dataset.accent = result.success
        ? result.data
        : DEFAULT_ACCENT
      sync()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [form])

  return (
    <Card>
      <CardHeader>
        <CardTitle>გარეგნობა</CardTitle>
      </CardHeader>
      <CardContent>
        <form.Field name="accent">
          {(field) => (
            <FieldSet>
              <FieldLegend variant="label" id="accent-legend">
                აქცენტის ფერი
              </FieldLegend>
              <RadioGroup
                aria-labelledby="accent-legend"
                value={field.state.value}
                onValueChange={(value) => {
                  const result = accentIdSchema.safeParse(value)
                  if (!result.success || result.data === field.state.value)
                    return
                  try {
                    window.localStorage.setItem(ACCENT_STORAGE_KEY, result.data)
                    document.documentElement.dataset.accent = result.data
                    field.handleChange(result.data)
                    toast.success('აქცენტის ფერი შენახულია.')
                  } catch {
                    toast.error(
                      'ფერი ვერ შეინახა. შეამოწმეთ ბრაუზერის საცავის პარამეტრები.',
                    )
                  }
                }}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              >
                {accentPalettes.map((palette) => (
                  <Field key={palette.id} orientation="horizontal">
                    <RadioGroupItem
                      id={`accent-${palette.id}`}
                      value={palette.id}
                    />
                    <FieldLabel htmlFor={`accent-${palette.id}`}>
                      <span
                        className="size-6 shrink-0 rounded-md"
                        style={{ backgroundColor: palette.swatch }}
                        aria-hidden="true"
                      />
                      {palette.label}
                    </FieldLabel>
                  </Field>
                ))}
              </RadioGroup>
              <FieldError errors={field.state.meta.errors} />
            </FieldSet>
          )}
        </form.Field>
      </CardContent>
    </Card>
  )
}
