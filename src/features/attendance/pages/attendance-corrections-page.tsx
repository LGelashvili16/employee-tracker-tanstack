import { IconClockEdit } from '@tabler/icons-react'
import { Badge } from '#/components/ui/badge'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'

export function AttendanceCorrectionsPage() {
  return (
    <Empty className="min-h-72 rounded-2xl border bg-card sm:min-h-80">
      <EmptyHeader className="max-w-md gap-3">
        <EmptyMedia aria-hidden="true">
          <IconClockEdit />
        </EmptyMedia>
        <Badge variant="secondary">მზადდება</Badge>
        <EmptyTitle>დროის შესწორების მოთხოვნები</EmptyTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          დროის ჩანაწერის შესწორების მოთხოვნის გაგზავნა ამ ეტაპზე ხელმისაწვდომი
          არ არის.
        </p>
      </EmptyHeader>
    </Empty>
  )
}
