import { useQuery } from '@tanstack/react-query'
import { Field, FieldLabel, FieldDescription } from '#/components/ui/field'
import { Switch } from '#/components/ui/switch'
import { Skeleton } from '#/components/ui/skeleton'
import { ScheduleWeekEditor } from '#/features/scheduling/components/schedule-week-editor'
import { getScheduleSettings } from '#/features/scheduling/scheduling.functions'
import type { z } from 'zod'
import type { employeeWorkingWeekSchema } from '#/features/scheduling/scheduling.schemas'

export function EmployeeScheduleField({
  value,
  onChange,
  disabled,
}: {
  value: z.infer<typeof employeeWorkingWeekSchema> | null
  onChange: (value: z.infer<typeof employeeWorkingWeekSchema> | null) => void
  disabled: boolean
}) {
  const query = useQuery({
    queryKey: ['schedule-settings'],
    queryFn: () => getScheduleSettings(),
    retry: false,
  })
  const current = query.data?.ok ? query.data.value.current : null
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-3">
      <Field orientation="horizontal">
        <div className="flex flex-1 flex-col gap-1">
          <FieldLabel htmlFor="provision-inherit-schedule">
            კომპანიის განრიგის გამოყენება
          </FieldLabel>
          <FieldDescription>
            გამორთეთ თანამშრომლის სამუშაო დღეებისა და საათების შესარჩევად.
          </FieldDescription>
        </div>
        <Switch
          id="provision-inherit-schedule"
          checked={value === null}
          disabled={disabled || !current}
          onCheckedChange={(inherit) =>
            onChange(inherit ? null : (current?.days ?? null))
          }
        />
      </Field>
      {query.isPending ? (
        <div role="status" aria-busy="true" aria-label="განრიგი იტვირთება">
          <Skeleton aria-hidden="true" className="h-5 w-full" />
        </div>
      ) : !current ? (
        <p className="text-xs text-muted-foreground">
          {query.isError || query.data.ok === false
            ? 'განრიგი ვერ ჩაიტვირთა. თანამშრომლის ანგარიში შეგიძლიათ საერთო განრიგით შექმნათ.'
            : 'ინდივიდუალური კვირის არჩევამდე განსაზღვრეთ კომპანიის განრიგი.'}
        </p>
      ) : null}
      {value !== null ? (
        <ScheduleWeekEditor
          days={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : null}
    </div>
  )
}
