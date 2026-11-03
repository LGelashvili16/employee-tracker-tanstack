import { FeaturePage } from '#/components/common/feature-page'
import { attendanceContent } from '../attendance.content'

export function AttendanceCorrectionsPage() {
  return <FeaturePage {...attendanceContent.attendanceCorrections} />
}
