import { FeaturePage } from '#/components/common/feature-page'
import { attendanceContent } from '../attendance.content'

export function AttendanceHistoryPage() {
  return <FeaturePage {...attendanceContent.attendanceHistory} />
}
