import { FeaturePage } from '#/components/common/feature-page'
import { attendanceContent } from '../attendance.content'
import { TeamAttendanceNavigation } from '../components/team-attendance-navigation'
import type { Role } from '#/lib/authorization/permissions'

export function TeamAttendancePage({ roles }: { roles: ReadonlyArray<Role> }) {
  return (
    <div className="flex flex-col gap-6">
      <TeamAttendanceNavigation roles={roles} />
      <FeaturePage {...attendanceContent.teamAttendance} />
    </div>
  )
}
