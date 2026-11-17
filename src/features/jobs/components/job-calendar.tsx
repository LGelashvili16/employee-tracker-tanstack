import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import { Calendar } from '#/components/ui/calendar'
import { jobCalendarDate, jobsToday } from '../jobs.dates'
import type { ComponentProps } from 'react'

/** Shared Georgian navigation and accessible date labels for job calendars. */
export function JobCalendar(props: ComponentProps<typeof Calendar>) {
  return (
    <Calendar
      captionLayout="dropdown"
      showOutsideDays={false}
      startMonth={new Date(1900, 0)}
      endMonth={new Date(2100, 11)}
      today={jobCalendarDate(jobsToday())}
      {...props}
      locale={ka}
      labels={{
        labelNav: () => 'კალენდრის ნავიგაცია',
        labelNext: () => 'კალენდრის შემდეგი თვე',
        labelPrevious: () => 'კალენდრის წინა თვე',
        labelMonthDropdown: () => 'თვე',
        labelYearDropdown: () => 'წელი',
        labelGrid: (date) => format(date, 'LLLL yyyy', { locale: ka }),
        labelDayButton: (date) => format(date, 'd MMMM yyyy', { locale: ka }),
      }}
      formatters={{
        formatMonthDropdown: (date) => format(date, 'LLLL', { locale: ka }),
      }}
    />
  )
}
