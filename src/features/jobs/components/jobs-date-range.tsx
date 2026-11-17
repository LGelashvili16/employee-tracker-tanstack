import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { subMonths } from 'date-fns'
import { IconCalendar } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { JobCalendar } from './job-calendar'
import { Field, FieldError, FieldGroup } from '#/components/ui/field'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '#/components/ui/popover'
import { useIsMobile } from '#/hooks/use-mobile'
import { jobDateRangeSchema } from '../jobs.schemas'
import {
  formatJobsRange,
  jobCalendarDate,
  jobCalendarDateString,
  jobsMonthRange,
} from '../jobs.dates'
import type { z } from 'zod'

type Range = z.infer<typeof jobDateRangeSchema>
export function JobsDateRange({
  value,
  onChange,
}: {
  value: Range
  onChange: (value: Range) => void
}) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => jobCalendarDate(value.from))
  const mobile = useIsMobile()
  const form = useForm({
    defaultValues: { from: value.from, to: value.to },
    validators: { onSubmit: jobDateRangeSchema },
    onSubmit: ({ value: range }) => apply(range),
  })
  function apply(range: Range) {
    const parsed = jobDateRangeSchema.safeParse(range)
    if (!parsed.success) return
    onChange(parsed.data)
    setOpen(false)
  }
  function chooseMonth(date: Date) {
    const range = jobsMonthRange(jobCalendarDateString(date).slice(0, 7))
    form.setFieldValue('from', range.from)
    form.setFieldValue('to', range.to)
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          form.reset({ from: value.from, to: value.to })
          setMonth(jobCalendarDate(value.from))
        }
        setOpen(next)
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            depth="raised"
            className="h-8 w-full justify-start sm:w-auto"
            aria-label={`სამუშაოების შექმნის პერიოდი: ${formatJobsRange(value)}`}
          />
        }
      >
        <IconCalendar aria-hidden="true" data-icon="inline-start" />
        {formatJobsRange(value)}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[min(85dvh,var(--available-height))] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] gap-3 overflow-y-auto p-3 sm:w-xl"
      >
        <PopoverHeader>
          <PopoverTitle>შექმნის პერიოდი</PopoverTitle>
          <PopoverDescription>თბილისის დროით</PopoverDescription>
        </PopoverHeader>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            depth="raised"
            size="sm"
            onClick={() => apply(jobsMonthRange())}
          >
            მიმდინარე თვე
          </Button>
          <Button
            type="button"
            variant="outline"
            depth="raised"
            size="sm"
            onClick={() =>
              apply(
                jobsMonthRange(
                  jobCalendarDateString(
                    subMonths(jobCalendarDate(jobsMonthRange().from), 1),
                  ).slice(0, 7),
                ),
              )
            }
          >
            წინა თვე
          </Button>
        </div>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <FieldGroup className="gap-3">
            <Field>
              <form.Subscribe selector={(state) => state.values}>
                {(range) => (
                  <>
                    <JobCalendar
                      mode="range"
                      resetOnSelect
                      month={month}
                      onMonthChange={setMonth}
                      numberOfMonths={mobile ? 1 : 2}
                      selected={{
                        from: range.from
                          ? jobCalendarDate(range.from)
                          : undefined,
                        to: range.to ? jobCalendarDate(range.to) : undefined,
                      }}
                      onSelect={(selected) => {
                        form.setFieldValue(
                          'from',
                          selected?.from
                            ? jobCalendarDateString(selected.from)
                            : '',
                        )
                        form.setFieldValue(
                          'to',
                          selected?.to
                            ? jobCalendarDateString(selected.to)
                            : '',
                        )
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      depth="raised"
                      size="sm"
                      onClick={() => chooseMonth(month)}
                    >
                      მთლიანი თვის მონიშვნა
                    </Button>
                    <p role="status" className="text-sm text-muted-foreground">
                      {range.from && range.to
                        ? formatJobsRange(range)
                        : 'აირჩიეთ პერიოდის დასაწყისი და დასასრული.'}
                    </p>
                    <div className="flex justify-end gap-2 border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        depth="raised"
                        onClick={() => setOpen(false)}
                      >
                        გაუქმება
                      </Button>
                      <Button
                        type="submit"
                        disabled={!jobDateRangeSchema.safeParse(range).success}
                      >
                        გამოყენება
                      </Button>
                    </div>
                  </>
                )}
              </form.Subscribe>
              <form.Subscribe selector={(state) => state.errors.length}>
                {(count) =>
                  count ? (
                    <FieldError
                      errors={[
                        { message: 'აირჩიეთ პერიოდის დასაწყისი და დასასრული.' },
                      ]}
                    />
                  ) : null
                }
              </form.Subscribe>
            </Field>
          </FieldGroup>
        </form>
      </PopoverContent>
    </Popover>
  )
}
