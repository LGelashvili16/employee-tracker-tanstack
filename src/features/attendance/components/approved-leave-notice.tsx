import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import {
  formatLeaveDate,
  formatLeaveEndDate,
} from '#/features/leave/leave.presentation'
import type { ApprovedLeave } from '#/features/leave/leave.types'

export function ApprovedLeaveNotice({ leave }: { leave: ApprovedLeave }) {
  return (
    <Alert variant="info" role="status">
      <AlertTitle>
        {leave.kind === 'sick_leave'
          ? 'დღეს ბიულეტენზე ხართ'
          : leave.kind === 'vacation'
            ? 'დღეს შვებულება გაქვთ'
            : 'დღეს დასვენების დღე გაქვთ'}
      </AlertTitle>
      <AlertDescription>
        {leave.startDate === leave.endDate
          ? formatLeaveDate(leave.startDate)
          : `${formatLeaveDate(leave.startDate)} / ${formatLeaveEndDate(leave.endDate)}`}
      </AlertDescription>
    </Alert>
  )
}
