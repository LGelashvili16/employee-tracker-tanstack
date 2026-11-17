import { format, parseISO } from 'date-fns'
import { ka } from 'date-fns/locale'

export const kindLabels = {
  day_off: 'დასვენების დღე',
  vacation: 'შვებულება',
  sick_leave: 'ბიულეტენი',
} as const
export const statusLabels = {
  pending: 'მოლოდინში',
  approved: 'დამტკიცებული',
  rejected: 'უარყოფილი',
  cancelled: 'გაუქმებული',
} as const
export const statusVariants = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  cancelled: 'secondary',
} as const
export function formatLeaveDate(value: string) {
  // The bundled locale keeps date-only labels Georgian even when the browser lacks Georgian Intl data.
  return format(parseISO(value), 'd MMMM yyyy', { locale: ka })
}

export const todayLeaveMessages = {
  day_off: 'დღეს დასვენების დღე გაქვთ',
  vacation: 'დღეს შვებულებაში ხართ',
  sick_leave: 'დღეს ბიულეტენზე ხართ',
} as const
export function formatLeaveEndDate(value: string | null) {
  return value ? formatLeaveDate(value) : 'მიმდინარე'
}
