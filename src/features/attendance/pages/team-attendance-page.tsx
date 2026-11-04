import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AttendanceReviewTable } from '../components/attendance-review-table'
import { attendanceContent } from '../attendance.content'
import { TeamAttendanceNavigation } from '../components/team-attendance-navigation'
import type { Role } from '#/lib/authorization/permissions'

export function TeamAttendancePage({
  roles,
  actorId,
  exceptionsOnly = false,
}: {
  roles: ReadonlyArray<Role>
  actorId: string
  exceptionsOnly?: boolean
}) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <div className="flex flex-col gap-6">
        <TeamAttendanceNavigation roles={roles} />
        <h1 className="text-2xl font-semibold">
          {exceptionsOnly
            ? attendanceContent.attendanceExceptions.title
            : attendanceContent.teamAttendance.title}
        </h1>
        <AttendanceReviewTable
          actorId={actorId}
          exceptionsOnly={exceptionsOnly}
        />
      </div>
    </QueryClientProvider>
  )
}
