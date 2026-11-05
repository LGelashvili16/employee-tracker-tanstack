import { TeamAttendancePage } from './team-attendance-page'
import type { Role } from '#/lib/authorization/permissions'

export function AttendanceExceptionsPage({
  roles,
  actorId,
}: {
  roles: ReadonlyArray<Role>
  actorId: string
}) {
  return <TeamAttendancePage roles={roles} actorId={actorId} exceptionsOnly />
}
