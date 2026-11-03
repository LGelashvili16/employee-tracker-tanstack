import { FeaturePage } from '#/components/common/feature-page'
import { attendanceContent } from '../attendance.content'

export function TeamAttendancePage() {
  return <FeaturePage {...attendanceContent.teamAttendance} />
}
