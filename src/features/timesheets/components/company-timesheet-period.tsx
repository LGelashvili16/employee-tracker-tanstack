import { useState } from 'react'
import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import { IconCalendar } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { formatWorkedTime } from '#/features/attendance/attendance.rules'
import { formatTimesheetMonth } from '../timesheets.rules'
import { timesheetMonthSchema } from '../timesheets.schemas'
import type { TimesheetResult, TimesheetSearch } from '../timesheets.types'

export function CompanyTimesheetPeriod({
  month,
  onChange,
  search,
}: {
  month?: string
  search: TimesheetSearch
  onChange: (search: TimesheetSearch, replace?: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = month ? new Date(`${month}-01T12:00:00`) : undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={!month}
        aria-label="თვის არჩევა"
        render={
          <Button
            type="button"
            variant="outline"
            depth="raised"
            className="w-full justify-start sm:w-auto"
          />
        }
      >
        <IconCalendar aria-hidden="true" />
        {month ? formatTimesheetMonth(month) : 'თვე იტვირთება'}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Calendar
          className="w-full"
          classNames={{ root: 'w-full' }}
          mode="single"
          locale={ka}
          selected={selected}
          defaultMonth={selected}
          startMonth={new Date(2000, 0, 1)}
          endMonth={new Date(2100, 11, 31)}
          disabled={[
            { before: new Date(2000, 0, 1) },
            { after: new Date(2100, 11, 31) },
          ]}
          formatters={{
            formatCaption: (date) => format(date, 'LLLL yyyy', { locale: ka }),
            formatWeekdayName: (date) => format(date, 'EEEEEE', { locale: ka }),
          }}
          labels={{
            labelNext: () => 'შემდეგი თვე',
            labelPrevious: () => 'წინა თვე',
            labelNav: () => 'თვეების ნავიგაცია',
            labelGrid: (date) => format(date, 'LLLL yyyy', { locale: ka }),
            labelDayButton: (date) =>
              format(date, 'EEEE, d MMMM yyyy', { locale: ka }),
          }}
          onSelect={(day) => {
            if (!day) return
            const parsed = timesheetMonthSchema.safeParse(
              format(day, 'yyyy-MM'),
            )
            if (!parsed.success) return
            onChange({ ...search, month: parsed.data, page: 0 })
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
export function CompanyTimesheetSummary({
  totals,
}: {
  totals: TimesheetResult['totals']
}) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border xl:grid-cols-4">
      {[
        ['აღრიცხული დრო', formatWorkedTime(totals.seconds)],
        ['დღის ჩანაწერები', String(totals.days)],
        [
          'დამტკიცებული დამატებითი დრო',
          formatWorkedTime(totals.approvedOutsideSeconds),
        ],
        ['განხილვის მოლოდინში', String(totals.pending)],
      ].map(([label, value]) => (
        <div key={label} className="flex flex-col gap-2 bg-card p-4">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-xl font-semibold tracking-tight tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
