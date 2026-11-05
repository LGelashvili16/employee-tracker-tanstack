import { FeaturePage } from '#/components/common/feature-page'
import { timesheetsContent } from '../timesheets.content'
import { AttendanceNavigation } from '#/features/attendance/components/attendance-navigation'

export function TimesheetsPage() {
  return (
    <AttendanceNavigation>
      <FeaturePage {...timesheetsContent.timesheets} />
    </AttendanceNavigation>
  )
}
