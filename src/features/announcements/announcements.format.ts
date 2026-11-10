import { format } from 'date-fns/format'
import { parseISO } from 'date-fns/parseISO'
import { ka } from 'date-fns/locale/ka'
import { companyLocalDate } from '#/features/scheduling/scheduling.rules'

export function formatAnnouncementDate(instant: string) {
  const date = companyLocalDate(new Date(instant), 'Asia/Tbilisi')
  return format(parseISO(date), 'd MMMM, yyyy', { locale: ka })
}
