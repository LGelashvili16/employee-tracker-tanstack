import { FeaturePage } from '#/components/common/feature-page'
import { attendanceContent } from '../attendance.content'

export function AttendanceSettingsPage() {
  return <FeaturePage {...attendanceContent.attendanceSettings} />
}
