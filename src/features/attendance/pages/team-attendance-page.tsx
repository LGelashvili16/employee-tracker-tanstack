import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AttendanceReviewTable } from '../components/attendance-review-table'
import { attendanceContent } from '../attendance.content'
import { TeamAttendanceNavigation } from '../components/team-attendance-navigation'
import { CompanyAttendanceNavigation } from '../components/company-attendance-navigation'
import type { Role } from '#/lib/authorization/permissions'

export function TeamAttendancePage({
  roles,
  actorId,
  exceptionsOnly = false,
  userId,
  company = false,
}: {
  roles: ReadonlyArray<Role>
  actorId: string
  exceptionsOnly?: boolean
  userId?: string
  company?: boolean
}) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <div className="flex flex-col gap-6">
        {company ? (
          <CompanyAttendanceNavigation userId={userId} />
        ) : (
          <TeamAttendanceNavigation roles={roles} />
        )}
        <h1 className="text-2xl font-semibold">
          {company
            ? 'ყველა თანამშრომლის დასწრება'
            : exceptionsOnly
              ? attendanceContent.attendanceExceptions.title
              : attendanceContent.teamAttendance.title}
        </h1>
        {userId ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p className="text-muted-foreground">
              ნაჩვენებია მხოლოდ არჩეული თანამშრომლის ხელმისაწვდომი ჩანაწერები.
            </p>
            <Link
              className="underline underline-offset-4"
              to={company ? '/admin/attendance' : '/manage/attendance'}
              search={{}}
            >
              ყველა ხელმისაწვდომი თანამშრომელი
            </Link>
          </div>
        ) : null}
        <AttendanceReviewTable
          key={userId ?? 'all'}
          actorId={actorId}
          exceptionsOnly={exceptionsOnly}
          userId={userId}
          company={company}
        />
      </div>
    </QueryClientProvider>
  )
}
