import { FeaturePage } from '#/components/common/feature-page'
import { ClockControls } from '../components/clock-controls'
import { attendanceContent } from '../attendance.content'

export function AttendancePage() {
  return (
    <FeaturePage {...attendanceContent.attendance}>
      <ClockControls />
    </FeaturePage>
  )
}
