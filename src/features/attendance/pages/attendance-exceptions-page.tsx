import { FeaturePage } from '#/components/common/feature-page'
import { attendanceContent } from '../attendance.content'

export function AttendanceExceptionsPage() {
  return <FeaturePage {...attendanceContent.attendanceExceptions} />
}
