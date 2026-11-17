import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import type { ComplaintStatus } from './complaints.schemas'

export const complaintStatusLabels: Record<ComplaintStatus, string> = {
  new: 'ახალი',
  in_review: 'განხილვაში',
  resolved: 'მოგვარებული',
  closed: 'დახურული',
}
export const complaintStatusVariants = {
  new: 'yellow',
  in_review: 'orange',
  resolved: 'green',
  closed: 'secondary',
} as const
export const complaintCategoryLabels = {
  conditions: 'სამუშაო პირობები',
  equipment: 'აღჭურვილობა',
  conduct: 'სამუშაო ურთიერთობები',
  other: 'სხვა',
}
export const complaintVisibilityLabels = {
  standard: 'HR, ადმინისტრატორი, მფლობელი და მინიჭებული ხელმძღვანელი',
  hr_only: 'მხოლოდ HR და კომპანიის მფლობელი',
}
export const complaintActionLabels = {
  created: 'რეგისტრაცია',
  reply: 'პასუხი',
  assigned: 'პასუხისმგებლის მინიჭება',
  status_changed: 'სტატუსის ცვლილება',
}
const complaintDateParts = new Intl.DateTimeFormat(
  'en-GB-u-ca-gregory-nu-latn',
  {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Tbilisi',
  },
)

/** Explicit Georgian month names also work in browsers without Georgian ICU locale data. */
export function complaintDate(value: string) {
  const parts = complaintDateParts.formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value
  const calendarDate = new Date(
    Number(part('year')),
    Number(part('month')) - 1,
    Number(part('day')),
    12,
  )
  return `${format(calendarDate, 'd MMMM yyyy', { locale: ka })}, ${part('hour')}:${part('minute')}`
}
